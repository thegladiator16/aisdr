import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const warmupSessions = pgTable(
  "warmup_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    gmailAccount: varchar("gmail_account", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    dayNumber: integer("day_number").default(0),
    emailsSentToday: integer("emails_sent_today").default(0),
    healthScore: integer("health_score").default(0),

    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_warmup_sessions_user").on(table.userId),
    userStatusIdx: index("idx_warmup_sessions_user_status").on(
      table.userId,
      table.status
    ),
  })
);

export type WarmupSession = typeof warmupSessions.$inferSelect;
export type NewWarmupSession = typeof warmupSessions.$inferInsert;

export const warmupEmails = pgTable(
  "warmup_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => warmupSessions.id, { onDelete: "cascade" }),

    fromEmail: varchar("from_email", { length: 255 }).notNull(),
    toEmail: varchar("to_email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }),
    body: text("body"),

    sentAt: timestamp("sent_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    status: varchar("status", { length: 32 }).default("sent"),
  },
  (table) => ({
    sessionIdx: index("idx_warmup_emails_session").on(table.sessionId),
  })
);

export type WarmupEmail = typeof warmupEmails.$inferSelect;
export type NewWarmupEmail = typeof warmupEmails.$inferInsert;
