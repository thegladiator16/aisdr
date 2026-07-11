import { sql, and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaignTriggers, subscriptions } from "@aisdr/db/schema";
import type { CampaignTrigger } from "@aisdr/db/schema";

// Runtime DDL guard so freshly-deployed environments have the table
// without needing a migration step. Kept out of the shared
// ensure-schema.ts to avoid write-conflicts with agents also touching
// that file — same pattern as apps/web/app/api/team/_lib.ts.
let campaignTriggersSchemaEnsured = false;
export async function ensureCampaignTriggersSchema() {
  if (campaignTriggersSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_triggers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        trigger_type varchar(50) NOT NULL,
        threshold integer NOT NULL,
        enabled boolean DEFAULT true NOT NULL,
        last_fired_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_campaign_triggers_user ON campaign_triggers(user_id)`
    );
    campaignTriggersSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] campaign_triggers failed:", err);
  }
}

export const TRIGGER_TYPES = [
  "subscription_days_old",
  "credits_used_pct",
  "manual",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

// evaluateTriggers reads every enabled trigger for a user and returns
// the ones whose condition currently holds. It does NOT enroll leads
// or mutate anything — deciding "should fire" is separate from actually
// firing (which for this codebase means running the reactivate/enroll
// pipeline; a scheduled cron would call this then invoke the enroller).
//
// Condition semantics:
//   - subscription_days_old: (now - subscriptions.currentPeriodStart)
//     in whole days >= threshold. If the user has no active
//     subscription row, the trigger cannot fire.
//   - credits_used_pct: subscriptions.leadsUsed / leadsLimit * 100 >=
//     threshold. leadsLimit === 0 is treated as "no limit" → false.
//   - manual: never fires from evaluateTriggers — those are fired by
//     an explicit UI action, so we skip them here.
export async function evaluateTriggers(
  userId: string
): Promise<CampaignTrigger[]> {
  await ensureCampaignTriggersSchema();

  const triggers = await db
    .select()
    .from(campaignTriggers)
    .where(
      and(
        eq(campaignTriggers.userId, userId),
        eq(campaignTriggers.enabled, true)
      )
    );

  if (triggers.length === 0) return [];

  // Pull the active subscription once — every trigger type currently
  // supported keys off it, so batching this avoids N round-trips.
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const now = Date.now();
  const fired: CampaignTrigger[] = [];

  for (const t of triggers) {
    if (t.triggerType === "manual") continue;

    if (t.triggerType === "subscription_days_old") {
      if (!sub?.currentPeriodStart) continue;
      const days = Math.floor(
        (now - new Date(sub.currentPeriodStart).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (days >= t.threshold) fired.push(t);
      continue;
    }

    if (t.triggerType === "credits_used_pct") {
      if (!sub) continue;
      const limit = sub.leadsLimit ?? 0;
      const used = sub.leadsUsed ?? 0;
      if (limit <= 0) continue;
      const pct = (used / limit) * 100;
      if (pct >= t.threshold) fired.push(t);
      continue;
    }
  }

  return fired;
}
