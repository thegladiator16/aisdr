import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const websiteVisitors = pgTable("website_visitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 255 }).notNull(),
  visitorEmail: varchar("visitor_email", { length: 255 }),
  company: varchar("company", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  pagesViewed: jsonb("pages_viewed").default([]),
  sessions: integer("sessions").default(1),
  source: varchar("source", { length: 100 }),
  medium: varchar("medium", { length: 100 }),
  campaign: varchar("campaign", { length: 200 }),
  qualified: boolean("qualified").default(false),
  seniority: varchar("seniority", { length: 50 }),
  department: varchar("department", { length: 100 }),
  location: varchar("location", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A domain the user has registered for visitor tracking, plus the settings
// chosen in the "Add domain" wizard. Actual visitor *identification* (real
// pageview beacons + reverse-IP-to-person/company resolution) needs a
// tracking script deployed to the customer's site and a third-party data
// provider (Apollo.io /organizations/enrich) — the tracking script and
// Apollo enrichment are now wired up via /api/track. What IS also
// real: registering a domain, and verifying the tracking snippet is
// genuinely present on the domain's live homepage.
export const trackedDomains = pgTable("tracked_domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 255 }).notNull(),
  identifyPeople: boolean("identify_people").default(true),
  identifyCompanies: boolean("identify_companies").default(true),
  budgetEnabled: boolean("budget_enabled").default(false),
  verificationToken: varchar("verification_token", { length: 64 }).notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
