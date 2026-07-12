import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Runtime DDL guard so freshly-deployed environments have the api_keys
// table without needing a migration step. Kept out of the shared
// ensure-schema.ts to avoid write-conflicts with agents also touching
// that file — same pattern as apps/web/app/api/campaign-triggers/_lib.ts.
let apiKeysSchemaEnsured = false;
export async function ensureApiKeysSchema() {
  if (apiKeysSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        key_prefix varchar(12) NOT NULL,
        key_hash varchar(64) NOT NULL,
        last_used_at timestamptz,
        disabled_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_prefix ON api_keys(user_id, key_prefix)`
    );
    apiKeysSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] api_keys failed:", err);
  }
}
