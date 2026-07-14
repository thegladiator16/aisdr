import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { replies } from "./replies";

/**
 * Auto-drafted replies produced by the Reply Handler Agent. One row
 * per generated draft; a reply can accumulate multiple drafts if the
 * agent runs more than once (e.g. re-classification after intent
 * changed). `sentAt` is set only when the draft was actually delivered
 * — either via the auto-reply toggle or a manual "Send" from the
 * inbox UI.
 */
export const replyDrafts = pgTable(
  "reply_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    replyId: uuid("reply_id")
      .notNull()
      .references(() => replies.id, { onDelete: "cascade" }),
    intent: varchar("intent", { length: 64 }).notNull(),
    draftBody: text("draft_body").notNull(),
    draftSubject: varchar("draft_subject", { length: 500 }),
    autoSent: boolean("auto_sent").default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    externalMessageId: varchar("external_message_id", { length: 500 }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_reply_drafts_user").on(table.userId),
    replyIdx: index("idx_reply_drafts_reply").on(table.replyId),
    unsentIdx: index("idx_reply_drafts_unsent").on(table.userId, table.sentAt),
  })
);

export type ReplyDraft = typeof replyDrafts.$inferSelect;
export type NewReplyDraft = typeof replyDrafts.$inferInsert;
