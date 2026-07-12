import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// In-app notifications for the sidebar bell. Kinds are enforced at the
// insert-site (see app/api/notifications/_lib.ts insertNotification) rather
// than as a DB enum — that lets us add new kinds without a migration.
//   "reply_received"    — new inbound reply matched to a lead (inbox sync)
//   "lead_added"        — a single lead was created (POST /api/leads)
//   "task_created"      — a task was created (reserved; not fired yet)
//   "campaign_paused"   — a campaign was auto-paused (reserved)
//   "team_member_joined"— an invited teammate accepted their invite
//   "generic"           — everything else / catch-all
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    // Where the bell dropdown row should navigate on click, e.g. "/inbox" or
    // "/leads/<id>". Nullable — some notifs are purely informational.
    targetUrl: varchar("target_url", { length: 500 }),
    // Null while unread; set to the read-time timestamp once marked read.
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    // Every list/unread-count query filters by userId and (readAt IS NULL);
    // this index covers both.
    userReadIdx: index("idx_notifications_user_read").on(t.userId, t.readAt),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
