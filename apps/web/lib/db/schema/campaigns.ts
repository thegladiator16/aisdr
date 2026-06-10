import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  smallint,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),

    targetIndustries: jsonb("target_industries").$type<string[]>().default([]),
    targetJobTitles: jsonb("target_job_titles").$type<string[]>().default([]),
    targetCompanySize: jsonb("target_company_size").$type<string[]>().default([]),
    targetLocations: jsonb("target_locations").$type<string[]>().default([]),
    targetFundingStages: jsonb("target_funding_stages").$type<string[]>().default([]),
    targetKeywords: jsonb("target_keywords").$type<string[]>().default([]),

    channels: jsonb("channels").$type<string[]>().default(["email"]),
    tone: varchar("tone", { length: 100 }).default("professional_warm"),
    language: varchar("language", { length: 50 }).default("english"),
    goal: varchar("goal", { length: 200 }).default("book_meeting"),

    sendDays: jsonb("send_days")
      .$type<string[]>()
      .default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
    sendTimeStart: varchar("send_time_start", { length: 10 }).default("09:00"),
    sendTimeEnd: varchar("send_time_end", { length: 10 }).default("18:00"),
    dailyLimit: smallint("daily_limit").default(30),

    totalLeads: integer("total_leads").default(0),
    emailsSent: integer("emails_sent").default(0),
    linkedinDmsSent: integer("linkedin_dms_sent").default(0),
    whatsappsSent: integer("whatsapps_sent").default(0),
    totalReplies: integer("total_replies").default(0),
    positiveReplies: integer("positive_replies").default(0),
    meetingsBooked: integer("meetings_booked").default(0),
    bounces: integer("bounces").default(0),
    unsubscribes: integer("unsubscribes").default(0),

    status: varchar("status", { length: 50 }).default("draft"),

    startedAt: timestamp("started_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_campaigns_user").on(table.userId),
    statusIdx: index("idx_campaigns_status").on(table.userId, table.status),
  })
);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
