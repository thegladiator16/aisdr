import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  smallint,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";
import { campaigns } from "./campaigns";

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),

    title: varchar("title", { length: 500 }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: smallint("duration_minutes").default(30),
    meetingUrl: varchar("meeting_url", { length: 500 }),
    calendarEventId: varchar("calendar_event_id", { length: 500 }),

    status: varchar("status", { length: 50 }).default("scheduled"),
    outcome: varchar("outcome", { length: 100 }),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_meetings_user").on(table.userId),
    scheduledIdx: index("idx_meetings_scheduled").on(
      table.userId,
      table.scheduledAt
    ),
  })
);

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
