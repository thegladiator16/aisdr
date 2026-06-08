import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
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
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default(
    "free"
  ),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default(
    "active"
  ),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Kolkata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
