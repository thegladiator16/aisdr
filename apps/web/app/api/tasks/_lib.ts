import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// This project applies new columns via idempotent runtime ALTERs rather than
// a migration step in the deploy pipeline (next build has no migrate step —
// see the same pattern in lib/db/ensure-schema.ts). This guard is scoped to
// the tasks table and lives in its own module (rather than inside
// route.ts, since Next.js's typed-routes checker rejects non-handler
// exports from a file literally named route.ts, and rather than the shared
// lib/db/ensure-schema.ts file, to avoid touching a file another task may be
// editing concurrently) so every route under app/api/tasks/** can import and
// call it regardless of which endpoint is hit first after a deploy.
let tasksSchemaEnsured = false;
export async function ensureTasksColumns() {
  if (tasksSchemaEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamptz`
    );
    await db.execute(
      sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid`
    );
    tasksSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] tasks columns failed:", err);
  }
}

export const TASK_TYPES = ["outbound_approval", "manual", "platform"] as const;
export const TASK_STATUSES = ["pending", "scheduled"] as const;
