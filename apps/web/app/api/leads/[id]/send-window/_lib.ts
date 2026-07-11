import { sql, and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leadSendWindows,
  outreachMessages,
  replies,
} from "@aisdr/db/schema";

// Runtime DDL guard for lead_send_windows (backs per-lead send-time
// optimization). Same pattern as app/api/team/_lib.ts.
let leadSendWindowsSchemaEnsured = false;
export async function ensureLeadSendWindowsSchema() {
  if (leadSendWindowsSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_send_windows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        lead_id uuid NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        preferred_hour_utc smallint,
        preferred_day_of_week smallint,
        samples_seen integer DEFAULT 0 NOT NULL,
        last_recomputed_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_lead_send_windows_user ON lead_send_windows(user_id)`
    );
    leadSendWindowsSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] lead_send_windows schema failed:", err);
  }
}

function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: number | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

export type ComputedWindow = {
  preferredHourUtc: number | null;
  preferredDayOfWeek: number | null;
  samplesSeen: number;
};

// Look at when this lead has historically opened messages and sent replies —
// the mode UTC hour and weekday of those events approximates the lead's most
// engaged window. Requires at least 3 samples before we commit to a
// preference (below that we return nulls so the caller falls back to the
// campaign's default send window).
export async function computePreferredWindow(
  userId: string,
  leadId: string
): Promise<ComputedWindow> {
  const opens = await db
    .select({ ts: outreachMessages.openedAt })
    .from(outreachMessages)
    .where(
      and(
        eq(outreachMessages.leadId, leadId),
        eq(outreachMessages.userId, userId)
      )
    );

  const reps = await db
    .select({ ts: replies.receivedAt })
    .from(replies)
    .where(and(eq(replies.leadId, leadId), eq(replies.userId, userId)));

  const timestamps: Date[] = [];
  for (const r of opens) if (r.ts) timestamps.push(r.ts);
  for (const r of reps) if (r.ts) timestamps.push(r.ts);

  if (timestamps.length < 3) {
    return {
      preferredHourUtc: null,
      preferredDayOfWeek: null,
      samplesSeen: timestamps.length,
    };
  }

  const hours = timestamps.map((d) => d.getUTCHours());
  const days = timestamps.map((d) => d.getUTCDay());

  return {
    preferredHourUtc: mode(hours),
    preferredDayOfWeek: mode(days),
    samplesSeen: timestamps.length,
  };
}

// Upsert the cached row and return it. Callers that need a fresh value (e.g.
// after a reply just arrived) should call this directly.
export async function recomputeAndCacheWindow(userId: string, leadId: string) {
  await ensureLeadSendWindowsSchema();
  const computed = await computePreferredWindow(userId, leadId);
  const existing = await db
    .select()
    .from(leadSendWindows)
    .where(eq(leadSendWindows.leadId, leadId))
    .limit(1);

  const now = new Date();
  if (existing[0]) {
    const updated = await db
      .update(leadSendWindows)
      .set({
        preferredHourUtc: computed.preferredHourUtc,
        preferredDayOfWeek: computed.preferredDayOfWeek,
        samplesSeen: computed.samplesSeen,
        lastRecomputedAt: now,
      })
      .where(eq(leadSendWindows.leadId, leadId))
      .returning();
    return updated[0];
  }
  const inserted = await db
    .insert(leadSendWindows)
    .values({
      leadId,
      userId,
      preferredHourUtc: computed.preferredHourUtc,
      preferredDayOfWeek: computed.preferredDayOfWeek,
      samplesSeen: computed.samplesSeen,
      lastRecomputedAt: now,
    })
    .returning();
  return inserted[0];
}

// Fetch the cached window. If the cache is missing or older than 24h,
// recompute lazily. Returns null when the caller doesn't own the lead — that
// ownership check must be performed by the calling route.
export async function getCachedOrRefreshWindow(
  userId: string,
  leadId: string
) {
  await ensureLeadSendWindowsSchema();
  const existing = await db
    .select()
    .from(leadSendWindows)
    .where(eq(leadSendWindows.leadId, leadId))
    .limit(1);

  const row = existing[0];
  const STALE_MS = 24 * 60 * 60 * 1000;
  if (
    !row ||
    !row.lastRecomputedAt ||
    Date.now() - row.lastRecomputedAt.getTime() > STALE_MS
  ) {
    return recomputeAndCacheWindow(userId, leadId);
  }
  return row;
}

// What a scheduler should call to pick the next send moment for this lead:
// returns the next Date at (preferredHourUtc, preferredDayOfWeek) at or after
// `now`. Returns null when there's no cached preference yet — caller should
// fall back to the campaign's configured send window.
export async function nextRecommendedSendTime(
  userId: string,
  leadId: string,
  now: Date
): Promise<Date | null> {
  await ensureLeadSendWindowsSchema();
  const rows = await db
    .select()
    .from(leadSendWindows)
    .where(
      and(
        eq(leadSendWindows.leadId, leadId),
        eq(leadSendWindows.userId, userId)
      )
    )
    .orderBy(desc(leadSendWindows.lastRecomputedAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.preferredHourUtc === null && row.preferredDayOfWeek === null)
    return null;

  const target = new Date(now.getTime());
  target.setUTCMinutes(0, 0, 0);
  if (row.preferredHourUtc !== null) {
    target.setUTCHours(row.preferredHourUtc);
  }
  if (row.preferredHourUtc !== null && target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  if (row.preferredDayOfWeek !== null) {
    // Roll forward until the weekday matches.
    let safety = 0;
    while (target.getUTCDay() !== row.preferredDayOfWeek && safety < 8) {
      target.setUTCDate(target.getUTCDate() + 1);
      safety++;
    }
  }
  return target;
}
