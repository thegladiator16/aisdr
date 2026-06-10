import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";
import { campaigns } from "./campaigns";
import { sequences, leadSequenceEnrollments } from "./sequences";

export const outreachMessages = pgTable(
  "outreach_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    sequenceId: uuid("sequence_id").references(() => sequences.id),
    enrollmentId: uuid("enrollment_id").references(
      () => leadSequenceEnrollments.id
    ),

    channel: varchar("channel", { length: 50 }).notNull(),
    stepNumber: smallint("step_number").default(1),

    subject: varchar("subject", { length: 1000 }),
    body: text("body").notNull(),

    aiGenerated: boolean("ai_generated").default(true),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    modelUsed: varchar("model_used", { length: 100 }),
    personalizationScore: smallint("personalization_score"),

    status: varchar("status", { length: 100 }).default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    openCount: smallint("open_count").default(0),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    repliedAt: timestamp("replied_at", { withTimezone: true }),

    externalMessageId: varchar("external_message_id", { length: 500 }),
    threadId: varchar("thread_id", { length: 500 }),
    error: text("error"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    leadIdx: index("idx_messages_lead").on(table.leadId),
    userIdx: index("idx_messages_user").on(table.userId),
    statusIdx: index("idx_messages_status").on(table.userId, table.status),
    scheduledIdx: index("idx_messages_scheduled").on(table.scheduledAt),
  })
);

export type OutreachMessage = typeof outreachMessages.$inferSelect;
export type NewOutreachMessage = typeof outreachMessages.$inferInsert;
