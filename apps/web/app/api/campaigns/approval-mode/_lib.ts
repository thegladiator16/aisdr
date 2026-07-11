import { sql } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";

// Runtime DDL guard for the per-campaign "human-in-the-loop approval mode"
// column. Follows the same idempotent-ALTER pattern used elsewhere in this
// project (e.g. app/api/agent-config/_lib.ts, app/api/team/_lib.ts) rather
// than editing lib/db/ensure-schema.ts — new features colocate their guards
// with the feature routes so each route can call the one it needs.
//
// Any route that reads or writes `campaigns.requireApproval` MUST await this
// at the top of the handler. The module-level flag makes repeated calls a
// no-op after the first success.
let approvalColumnEnsured = false;

export async function ensureCampaignsApprovalColumn(): Promise<void> {
  if (approvalColumnEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS require_approval boolean DEFAULT false NOT NULL`
    );
    approvalColumnEnsured = true;
  } catch (err) {
    console.error("[approval-mode] ensure column failed:", err);
  }
}

// Should draft outreach for this (userId, campaignId) be queued into the
// Tasks table (taskType="outbound_approval") for human review instead of
// being dispatched?
//
// This is the canonical check the send-scheduler (which lives in
// apps/agent-service, out of scope for this repo) must consult before
// dispatching any drafted message. When it returns true, the scheduler
// should INSERT a row into `tasks` with taskType="outbound_approval",
// status="pending", the drafted body in `message`, the target leadId, and
// this campaignId — instead of writing to `outreachMessages` with
// status="sent". Any client-side "send now" action should call this too.
//
// Ownership is enforced by scoping the SELECT to userId — a caller with the
// wrong userId will get `false` (fail-closed: do not queue, do not send,
// caller decides what to do with a missing/unauthorized campaign).
export async function shouldQueueForApproval(
  userId: string,
  campaignId: string
): Promise<boolean> {
  if (!userId || !campaignId) return false;
  await ensureCampaignsApprovalColumn();
  try {
    const rows = await db
      .select({ requireApproval: campaigns.requireApproval })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .limit(1);
    return Boolean(rows[0]?.requireApproval);
  } catch (err) {
    console.error("[approval-mode] shouldQueueForApproval failed:", err);
    return false;
  }
}
