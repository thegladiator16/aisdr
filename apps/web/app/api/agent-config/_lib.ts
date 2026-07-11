import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Runtime DDL guard for the agent_config_items table (backs the entire
// Manage Arya "configurable lists" UI: coaching points, proof, escalation
// rules, knowledge, reply coaching, qualification, DNC lists, banned
// phrases). Follows the same pattern as app/api/team/_lib.ts:
// idempotent CREATE TABLE IF NOT EXISTS, gated by a module-level flag so
// we only issue the DDL once per lambda cold start.
let agentConfigSchemaEnsured = false;

export async function ensureAgentConfigSchema() {
  if (agentConfigSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_config_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category varchar(50) NOT NULL,
        title varchar(1000) NOT NULL,
        content text,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_agent_config_user_category ON agent_config_items(user_id, category)`
    );
    agentConfigSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] agent_config schema failed:", err);
  }
}
