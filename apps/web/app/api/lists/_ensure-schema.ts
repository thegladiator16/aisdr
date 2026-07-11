import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// This route group owns its own idempotent schema guard instead of editing
// the shared apps/web/lib/db/ensure-schema.ts (which may be edited
// concurrently elsewhere) — mirrors the exact pattern already established
// there: this codebase applies new tables/columns via idempotent runtime
// DDL rather than a migration step in the deploy pipeline, so every route
// touching `lists` / `list_leads` must call this before querying.
let listsSchemaEnsured = false;
export async function ensureListsSchema() {
  if (listsSchemaEnsured) return;
  try {
    // "lists" already ships in the initial drizzle migration, but guard it
    // too in case that migration was never applied against the live DB.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        description text,
        lead_count integer DEFAULT 0,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS list_leads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        added_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_list_leads_list ON list_leads (list_id)`
    );
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_list_leads_list_lead_unique ON list_leads (list_id, lead_id)`
    );
    listsSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] lists/list_leads schema failed:", err);
  }
}
