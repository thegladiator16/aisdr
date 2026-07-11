import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { leads } from "./leads";
import { users } from "./users";
import { campaigns } from "./campaigns";

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

// A user's configured "when this signal fires, enroll matching leads into
// this campaign" subscription — distinct from `intentSignals` above, which
// is the (currently unpopulated — no detection engine exists yet) log of
// individual signal detections against a specific lead.
export const signalSubscriptions = pgTable(
  "signal_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),

    signalType: varchar("signal_type", { length: 100 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_signal_subscriptions_user").on(table.userId),
  })
);

export type IntentSignalRow = typeof intentSignals.$inferSelect;
export type NewIntentSignal = typeof intentSignals.$inferInsert;
export type SignalSubscription = typeof signalSubscriptions.$inferSelect;
export type NewSignalSubscription = typeof signalSubscriptions.$inferInsert;
