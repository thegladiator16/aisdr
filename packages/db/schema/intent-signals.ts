import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { leads } from "./leads";

export const intentSignals = pgTable(
  "intent_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),

    signalType: varchar("signal_type", { length: 50 }).notNull(),
    description: text("description"),
    signalDate: varchar("signal_date", { length: 50 }),
    source: varchar("source", { length: 200 }),
    score: integer("score").default(5),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    leadIdx: index("idx_intent_signals_lead").on(table.leadId),
  })
);

export type IntentSignalRow = typeof intentSignals.$inferSelect;
export type NewIntentSignal = typeof intentSignals.$inferInsert;
