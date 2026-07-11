import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  fullName: varchar("full_name", { length: 255 }),
  companyName: varchar("company_name", { length: 500 }),
  companyWebsite: varchar("company_website", { length: 500 }),
  companyDescription: text("company_description"),
  targetMarket: varchar("target_market", { length: 200 }),
  industry: varchar("industry", { length: 200 }),
  valueProposition: text("value_proposition"),
  calendarLink: varchar("calendar_link", { length: 500 }),
  emailSignature: text("email_signature"),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default(
    "free"
  ),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default(
    "active"
  ),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Kolkata"),
  role: varchar("role", { length: 200 }),
  companySize: varchar("company_size", { length: 100 }),
  outreachTone: varchar("outreach_tone", { length: 50 }).default("Professional"),
  outreachChannels: jsonb("outreach_channels").$type<string[]>().default(["Email"]),
  dailySendLimit: integer("daily_send_limit").default(30),
  personalCity: varchar("personal_city", { length: 200 }),
  previousCompanies: text("previous_companies"),
  previousSchools: text("previous_schools"),
  companyDomains: jsonb("company_domains").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
