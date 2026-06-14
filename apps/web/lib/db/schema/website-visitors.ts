import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
