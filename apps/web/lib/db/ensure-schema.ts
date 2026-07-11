import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// This project applies new columns via idempotent runtime ALTERs rather than
// a migration step in the deploy pipeline (see the same pattern already in
// app/api/user/subscription/route.ts) — these guards keep schema.ts and the
// live DB in sync no matter which route hits the table first after a deploy.
let campaignsEnsured = false;
export async function ensureCampaignsColumns() {
  if (campaignsEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type varchar(100)`
    );
    campaignsEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] campaigns columns failed:", err);
  }
}

let repliesEnsured = false;
export async function ensureRepliesColumns() {
  if (repliesEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE replies ADD COLUMN IF NOT EXISTS external_message_id varchar(255)`
    );
    await db.execute(
      sql`ALTER TABLE replies ADD COLUMN IF NOT EXISTS thread_id varchar(500)`
    );
    repliesEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] replies columns failed:", err);
  }
}

let usersOnboardingEnsured = false;
export async function ensureUsersOnboardingColumns() {
  if (usersOnboardingEnsured) return;
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(200)`);
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size varchar(100)`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS outreach_tone varchar(50) DEFAULT 'Professional'`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS outreach_channels jsonb DEFAULT '["Email"]'`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_send_limit integer DEFAULT 30`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_city varchar(200)`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_companies text`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_schools text`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_domains jsonb DEFAULT '[]'`
    );
    usersOnboardingEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] users onboarding columns failed:", err);
  }
}

let signalSubscriptionsEnsured = false;
export async function ensureSignalSubscriptionsTable() {
  if (signalSubscriptionsEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS signal_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        signal_type varchar(100) NOT NULL,
        enabled boolean DEFAULT true NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_signal_subscriptions_user ON signal_subscriptions(user_id)`
    );
    signalSubscriptionsEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] signal_subscriptions table failed:", err);
  }
}

let websiteVisitorsEnsured = false;
export async function ensureWebsiteVisitorsSchema() {
  if (websiteVisitorsEnsured) return;
  try {
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS campaign varchar(200)`
    );
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS qualified boolean DEFAULT false`
    );
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS seniority varchar(50)`
    );
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS department varchar(100)`
    );
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS location varchar(200)`
    );
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS phone varchar(50)`
    );
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS first_seen_at timestamp DEFAULT now()`
    );
    await db.execute(
      sql`ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS last_seen_at timestamp DEFAULT now()`
    );
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tracked_domains (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        domain varchar(255) NOT NULL,
        identify_people boolean DEFAULT true,
        identify_companies boolean DEFAULT true,
        budget_enabled boolean DEFAULT false,
        verification_token varchar(64) NOT NULL,
        verified boolean DEFAULT false,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_tracked_domains_user ON tracked_domains(user_id)`
    );
    websiteVisitorsEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] website visitors schema failed:", err);
  }
}
