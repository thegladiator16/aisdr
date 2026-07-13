/**
 * Idempotent CREATE TABLE IF NOT EXISTS guard for the three agent-* tables.
 * Matches the codebase's existing ensure-schema pattern (lib/db/ensure-
 * schema.ts) so a fresh serverless instance's first request DDLs the tables
 * without a separate migration step — the same trade-off every other table
 * in this app already accepts.
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

let ensured = false;

export async function ensureAgentTables(): Promise<void> {
  if (ensured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
        status varchar(32) NOT NULL DEFAULT 'pending',
        goal text NOT NULL,
        input jsonb DEFAULT '{}'::jsonb,
        output jsonb,
        error_message text,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_runs_campaign ON agent_runs(campaign_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(user_id, status);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
        agent_name varchar(64) NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'pending',
        input jsonb DEFAULT '{}'::jsonb,
        output jsonb,
        error_message text,
        sequence integer NOT NULL DEFAULT 0,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_tasks_run ON agent_tasks(run_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_name, status);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
        level varchar(16) NOT NULL DEFAULT 'info',
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_logs_task ON agent_logs(task_id, created_at);`);
    ensured = true;
  } catch (err) {
    console.error("[agents] ensureAgentTables failed:", err);
  }
}
