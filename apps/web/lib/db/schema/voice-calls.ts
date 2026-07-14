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
import { leads } from "./leads";

export const voiceCalls = pgTable(
  "voice_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    leadId: uuid("lead_id").references(() => leads.id),

    phone: varchar("phone", { length: 50 }).notNull(),
    duration: integer("duration"),
    transcript: text("transcript"),
    outcome: varchar("outcome", { length: 50 }),
    recordingUrl: text("recording_url"),

    calledAt: timestamp("called_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_voice_calls_user").on(table.userId),
    leadIdx: index("idx_voice_calls_lead").on(table.leadId),
  })
);

export type VoiceCall = typeof voiceCalls.$inferSelect;
export type NewVoiceCall = typeof voiceCalls.$inferInsert;
