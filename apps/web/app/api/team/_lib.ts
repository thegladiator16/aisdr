import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// This project applies new tables/columns via idempotent runtime DDL rather
// than a migration step in the deploy pipeline (see the same pattern in
// lib/db/ensure-schema.ts) — this guard keeps schema/team.ts and the live DB
// in sync no matter which route hits these tables first after a deploy.
// Kept in this differently-named file (not route.ts) because Next.js route
// files may only export handler functions + a small set of config exports.
let teamSchemaEnsured = false;
export async function ensureTeamSchema() {
  if (teamSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        is_system boolean DEFAULT false,
        permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email varchar(255) NOT NULL,
        role_name varchar(100) NOT NULL,
        status varchar(50) DEFAULT 'invited',
        invite_token varchar(64) UNIQUE,
        add_as_sender boolean DEFAULT true,
        invited_at timestamptz DEFAULT now() NOT NULL,
        joined_at timestamptz,
        accepted_by_user_id uuid REFERENCES users(id)
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_team_roles_owner ON team_roles(owner_user_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_user_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_team_members_token ON team_members(invite_token)`
    );
    teamSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] team schema failed:", err);
  }
}
