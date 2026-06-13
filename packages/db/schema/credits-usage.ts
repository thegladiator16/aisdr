import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { campaigns } from "./campaigns";

export const creditsUsage = pgTable(
  "credits_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),

    action: varchar("action", { length: 50 }).notNull(),
    creditsUsed: integer("credits_used").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_credits_usage_user").on(table.userId),
    actionIdx: index("idx_credits_usage_action").on(table.userId, table.action),
  })
);

export type CreditsUsageRow = typeof creditsUsage.$inferSelect;
export type NewCreditsUsage = typeof creditsUsage.$inferInsert;
