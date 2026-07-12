import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@aisdr/db/schema";

// This project applies new tables/columns via idempotent runtime DDL rather
// than a migration step in the deploy pipeline (see the same pattern in
// lib/db/ensure-schema.ts and app/api/team/_lib.ts) — this guard keeps
// schema/notifications.ts and the live DB in sync no matter which route
// hits this table first after a deploy.
// Kept in this differently-named file (not route.ts) because Next.js route
// files may only export handler functions + a small set of config exports.
let notificationsSchemaEnsured = false;
export async function ensureNotificationsSchema() {
  if (notificationsSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind varchar(50) NOT NULL,
        title varchar(255) NOT NULL,
        body text,
        target_url varchar(500),
        read_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at)`
    );
    notificationsSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] notifications schema failed:", err);
  }
}

export type NotificationKind =
  | "reply_received"
  | "lead_added"
  | "task_created"
  | "campaign_paused"
  | "team_member_joined"
  | "generic";

export interface InsertNotificationInput {
  kind: NotificationKind;
  title: string;
  body?: string;
  targetUrl?: string;
}

/**
 * Fire-and-forget notification insert used by event-point call sites (lead
 * creation, inbox sync, team-invite acceptance). ANY failure is swallowed —
 * the caller's main flow (creating the lead, syncing the reply, accepting
 * the invite) must never break because a notification insert failed.
 */
export async function insertNotification(
  userId: string,
  input: InsertNotificationInput
): Promise<void> {
  try {
    await ensureNotificationsSchema();
    await db.insert(notifications).values({
      userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      targetUrl: input.targetUrl,
    });
  } catch (err) {
    console.error("[insertNotification] failed:", err);
  }
}
