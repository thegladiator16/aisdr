import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  smallint,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { campaigns } from "./campaigns";
import { leads } from "./leads";

export type SequenceStep = {
  stepNumber: number;
  channel: "email" | "linkedin_connection" | "linkedin_dm" | "whatsapp";
  delayDays: number;
  subject?: string;
  body?: string;
  condition: "always" | "if_no_reply" | "if_opened";
};

export const sequences = pgTable("sequences", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),

  name: varchar("name", { length: 500 }).notNull(),
  steps: jsonb("steps").$type<SequenceStep[]>().notNull().default([]),
  totalSteps: smallint("total_steps").default(0),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leadSequenceEnrollments = pgTable(
  "lead_sequence_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => sequences.id),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    currentStep: smallint("current_step").default(0),
    status: varchar("status", { length: 100 }).default("active"),

    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    nextStepAt: timestamp("next_step_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    repliedAt: timestamp("replied_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    leadIdx: index("idx_enrollments_lead").on(table.leadId),
    sequenceIdx: index("idx_enrollments_sequence").on(table.sequenceId),
    statusIdx: index("idx_enrollments_status").on(table.userId, table.status),
    nextStepIdx: index("idx_enrollments_next_step").on(table.nextStepAt),
  })
);

export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
export type LeadSequenceEnrollment =
  typeof leadSequenceEnrollments.$inferSelect;
export type NewLeadSequenceEnrollment =
  typeof leadSequenceEnrollments.$inferInsert;
