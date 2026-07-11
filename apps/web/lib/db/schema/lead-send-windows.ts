import {
  pgTable,
  uuid,
  smallint,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";

// Cached per-lead preferred send window computed from historical opens/replies.
// One row per lead. Populated lazily by computePreferredWindow() in
// app/api/leads/[id]/send-window/_lib.ts and consumed by
// nextRecommendedSendTime() to pick when a scheduler should fire the next step.
export const leadSendWindows = pgTable(
  "lead_send_windows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // One preferred-window row per lead.
    leadId: uuid("lead_id")
      .notNull()
      .unique()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // 0-23 in UTC; null when we don't have enough samples yet.
    preferredHourUtc: smallint("preferred_hour_utc"),
    // 0=Sunday ... 6=Saturday (matches JS Date.getUTCDay).
    preferredDayOfWeek: smallint("preferred_day_of_week"),

    samplesSeen: integer("samples_seen").default(0).notNull(),
    lastRecomputedAt: timestamp("last_recomputed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_lead_send_windows_user").on(table.userId),
  })
);

export type LeadSendWindow = typeof leadSendWindows.$inferSelect;
export type NewLeadSendWindow = typeof leadSendWindows.$inferInsert;
