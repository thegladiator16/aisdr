import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  smallint,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    type: varchar("type", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).default("active"),

    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scope: text("scope"),

    accountEmail: varchar("account_email", { length: 255 }),
    accountName: varchar("account_name", { length: 255 }),
    accountId: varchar("account_id", { length: 500 }),

    apiKey: text("api_key"),
    webhookUrl: varchar("webhook_url", { length: 500 }),

    dailyEmailLimit: smallint("daily_email_limit").default(150),
    dailyLinkedinLimit: smallint("daily_linkedin_limit").default(40),
    dailyWhatsappLimit: smallint("daily_whatsapp_limit").default(100),

    emailsSentToday: smallint("emails_sent_today").default(0),
    linkedinSentToday: smallint("linkedin_sent_today").default(0),
    whatsappSentToday: smallint("whatsapp_sent_today").default(0),
    lastResetAt: timestamp("last_reset_at", { withTimezone: true }),

    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    error: text("error"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_integrations_user").on(table.userId),
    typeIdx: index("idx_integrations_type").on(table.userId, table.type),
  })
);

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
