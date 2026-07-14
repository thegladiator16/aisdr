import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";

export const linkedinOutreach = pgTable(
  "linkedin_outreach",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    leadId: uuid("lead_id").references(() => leads.id),

    profileUrl: text("profile_url").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    message: text("message"),
    status: varchar("status", { length: 50 }).notNull().default("pending"),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_linkedin_outreach_user").on(table.userId),
    leadIdx: index("idx_linkedin_outreach_lead").on(table.leadId),
    userStatusIdx: index("idx_linkedin_outreach_user_status").on(
      table.userId,
      table.status
    ),
  })
);

export type LinkedInOutreach = typeof linkedinOutreach.$inferSelect;
export type NewLinkedInOutreach = typeof linkedinOutreach.$inferInsert;
