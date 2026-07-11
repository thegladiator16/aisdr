import { sql, and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageVariants } from "@aisdr/db/schema";

// Runtime DDL guard for message_variants (backs A/Z testing).
// Same pattern as app/api/team/_lib.ts and app/api/agent-config/_lib.ts:
// idempotent CREATE TABLE IF NOT EXISTS gated by a module-level flag so we
// only issue the DDL once per lambda cold start.
let messageVariantsSchemaEnsured = false;
export async function ensureMessageVariantsSchema() {
  if (messageVariantsSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_variants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        sequence_id uuid NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
        step_number smallint NOT NULL,
        variant_key varchar(20) NOT NULL,
        subject varchar(1000),
        body text,
        is_active boolean DEFAULT true,
        impression_count integer DEFAULT 0 NOT NULL,
        positive_response_count integer DEFAULT 0 NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_message_variants_step ON message_variants(sequence_id, step_number)`
    );
    messageVariantsSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] message_variants schema failed:", err);
  }
}

// Epsilon-greedy variant picker for A/Z testing. 10% pure random exploration,
// 90% exploit the current best-so-far positive-response rate. Variants with
// zero impressions are treated as unknowns and are always exploration
// candidates (we still let them get sampled by the random branch).
//
// Note: no send-scheduler exists in this codebase yet (agent-service is a
// separate Python microservice, out of scope for this repo). Future work that
// wires up sending should call this to pick which variant text to write into
// outreach_messages, then bump impression_count on that variant. Positive
// responses (replies with sentiment=positive) should bump
// positive_response_count so the picker keeps shifting weight to the winner.
export async function pickVariant(
  sequenceId: string,
  stepNumber: number
): Promise<{
  id: string;
  variantKey: string;
  subject: string | null;
  body: string | null;
} | null> {
  await ensureMessageVariantsSchema();

  const rows = await db
    .select({
      id: messageVariants.id,
      variantKey: messageVariants.variantKey,
      subject: messageVariants.subject,
      body: messageVariants.body,
      impressionCount: messageVariants.impressionCount,
      positiveResponseCount: messageVariants.positiveResponseCount,
      isActive: messageVariants.isActive,
    })
    .from(messageVariants)
    .where(
      and(
        eq(messageVariants.sequenceId, sequenceId),
        eq(messageVariants.stepNumber, stepNumber)
      )
    );

  const active = rows.filter((r) => r.isActive !== false);
  if (active.length === 0) return null;

  // 10% pure random exploration.
  if (Math.random() < 0.1) {
    const pick = active[Math.floor(Math.random() * active.length)];
    return {
      id: pick.id,
      variantKey: pick.variantKey,
      subject: pick.subject,
      body: pick.body,
    };
  }

  // 90% exploit: pick the highest positive-response rate. Unimpressioned
  // variants get a tiny optimistic prior so they get tried at least once
  // before the picker locks in on an early winner.
  let best = active[0];
  let bestRate = -1;
  for (const v of active) {
    const rate =
      v.impressionCount > 0
        ? v.positiveResponseCount / v.impressionCount
        : 0.5; // optimistic prior for unexplored variants
    if (rate > bestRate) {
      bestRate = rate;
      best = v;
    }
  }
  return {
    id: best.id,
    variantKey: best.variantKey,
    subject: best.subject,
    body: best.body,
  };
}
