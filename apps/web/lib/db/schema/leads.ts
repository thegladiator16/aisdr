import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    fullName: varchar("full_name", { length: 500 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    linkedinUrl: varchar("linkedin_url", { length: 500 }),
    twitterUrl: varchar("twitter_url", { length: 500 }),

    companyName: varchar("company_name", { length: 500 }),
    companyWebsite: varchar("company_website", { length: 500 }),
    companyLinkedinUrl: varchar("company_linkedin_url", { length: 500 }),
    companySize: varchar("company_size", { length: 100 }),
    industry: varchar("industry", { length: 200 }),
    fundingStage: varchar("funding_stage", { length: 100 }),
    fundingAmount: varchar("funding_amount", { length: 100 }),
    location: varchar("location", { length: 200 }),
    country: varchar("country", { length: 100 }),

    jobTitle: varchar("job_title", { length: 255 }),
    seniority: varchar("seniority", { length: 100 }),
    department: varchar("department", { length: 100 }),

    researchSummary: text("research_summary"),
    recentActivity: jsonb("recent_activity").$type<
      Array<{ type: string; content: string; date: string }>
    >().default([]),
    painPoints: jsonb("pain_points").$type<string[]>().default([]),
    personalityNotes: text("personality_notes"),
    icebreakers: jsonb("icebreakers").$type<string[]>().default([]),

    status: varchar("status", { length: 100 }).default("new"),
    score: smallint("score"),
    isVerified: boolean("is_verified").default(false),
    source: varchar("source", { length: 100 }),

    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("idx_leads_user").on(table.userId),
    statusIdx: index("idx_leads_status").on(table.userId, table.status),
    emailIdx: index("idx_leads_email").on(table.email),
    companyIdx: index("idx_leads_company").on(table.companyName),
  })
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
