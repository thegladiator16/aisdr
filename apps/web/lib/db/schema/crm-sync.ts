import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const crmIntegrations = pgTable(
  "crm_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    provider: varchar("provider", { length: 50 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    portalId: varchar("portal_id", { length: 100 }),
    instanceUrl: varchar("instance_url", { length: 500 }),
    syncEnabled: boolean("sync_enabled").default(false),

    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_crm_integrations_user").on(table.userId),
    userProviderUnique: uniqueIndex("idx_crm_integrations_user_provider").on(
      table.userId,
      table.provider
    ),
  })
);

export type CrmIntegration = typeof crmIntegrations.$inferSelect;
export type NewCrmIntegration = typeof crmIntegrations.$inferInsert;
