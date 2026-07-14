import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";
import { outreachMessages } from "./outreach-messages";

export const replies = pgTable(
  "replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    messageId: uuid("message_id").references(() => outreachMessages.id),

    channel: varchar("channel", { length: 50 }).notNull(),
    subject: varchar("subject", { length: 1000 }),
    body: text("body").notNull(),

    sentiment: varchar("sentiment", { length: 50 }),
    intent: varchar("intent", { length: 100 }),
    aiSuggestedReply: text("ai_suggested_reply"),
    requiresAction: boolean("requires_action").default(true),
    actionType: varchar("action_type", { length: 100 }),

    isRead: boolean("is_read").default(false),
    isActedOn: boolean("is_acted_on").default(false),

    externalMessageId: varchar("external_message_id", { length: 255 }),
    threadId: varchar("thread_id", { length: 500 }),
    // RFC 2822 Message-ID header value from the inbound mail, e.g.
    // <CAAxxx@mail.gmail.com>. Used for In-Reply-To/References headers when
    // auto-replying. external_message_id holds the Gmail API opaque id (dedup).
    rfcMessageId: varchar("rfc_message_id", { length: 1000 }),

    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_replies_user").on(table.userId),
    leadIdx: index("idx_replies_lead").on(table.leadId),
    unreadIdx: index("idx_replies_unread").on(table.userId, table.isRead),
    externalMessageIdx: index("idx_replies_external_message").on(
      table.userId,
      table.externalMessageId
    ),
  })
);

export type Reply = typeof replies.$inferSelect;
export type NewReply = typeof replies.$inferInsert;
