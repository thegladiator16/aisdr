import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),

  tier: varchar("tier", { length: 50 }).notNull().default("free"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  currency: varchar("currency", { length: 10 }).default("USD"),

  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 255 }),
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),

  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

  leadsLimit: integer("leads_limit").default(10000),
  emailsMonthlyLimit: integer("emails_monthly_limit").default(10000),
  linkedinEnabled: boolean("linkedin_enabled").default(false),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  aiLeadFinderMonthly: integer("ai_lead_finder_monthly").default(0),
  emailAccountsLimit: integer("email_accounts_limit").default(1),

  leadsUsed: integer("leads_used").default(0),
  emailsUsedThisMonth: integer("emails_used_this_month").default(0),
  aiLeadFinderUsed: integer("ai_lead_finder_used").default(0),

  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),

  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  status: varchar("status", { length: 50 }).notNull(),

  provider: varchar("provider", { length: 50 }).notNull(),
  providerPaymentId: varchar("provider_payment_id", { length: 255 }),
  providerOrderId: varchar("provider_order_id", { length: 255 }),

  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
