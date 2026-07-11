import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { campaigns } from "./campaigns";

// Auto-triggers that enroll a set of leads into a campaign when a
// condition is met (e.g. subscription is X days old → run an upsell
// campaign). Firing is not implemented in this schema — this just
// records the rule; a scheduled job or "evaluate now" button reads
// these rows and decides which campaigns to enroll.
export const campaignTriggers = pgTable(
  "campaign_triggers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),

    // One of: "subscription_days_old", "credits_used_pct", "manual".
    triggerType: varchar("trigger_type", { length: 50 }).notNull(),
    // Interpretation depends on triggerType:
    //  - subscription_days_old: days since currentPeriodStart
    //  - credits_used_pct:      percent 0-100 of leads used against leadsLimit
    //  - manual:                unused, threshold ignored
    threshold: integer("threshold").notNull(),

    enabled: boolean("enabled").default(true).notNull(),
    lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_campaign_triggers_user").on(table.userId),
  })
);

export type CampaignTrigger = typeof campaignTriggers.$inferSelect;
export type NewCampaignTrigger = typeof campaignTriggers.$inferInsert;
