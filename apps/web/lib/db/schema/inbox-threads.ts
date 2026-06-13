import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";
import { campaigns } from "./campaigns";

export const inboxThreads = pgTable(
  "inbox_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),

    subject: text("subject"),
    threadMessages: jsonb("thread_messages")
      .$type<
        Array<{
          role: string;
          content: string;
          sentAt: string;
        }>
      >()
      .default([]),
    intentClassification: varchar("intent_classification", { length: 50 }),
    aryaDraftReply: text("arya_draft_reply"),
    status: varchar("status", { length: 50 }).default("unread"),

    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_inbox_threads_user").on(table.userId),
    statusIdx: index("idx_inbox_threads_status").on(table.userId, table.status),
  })
);

export type InboxThread = typeof inboxThreads.$inferSelect;
export type NewInboxThread = typeof inboxThreads.$inferInsert;
