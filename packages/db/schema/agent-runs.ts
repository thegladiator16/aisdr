import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { campaigns } from "./campaigns";

/**
 * One row per orchestrated multi-agent campaign run. The row is the parent
 * of many `agent_tasks` (one per agent invocation) and, transitively,
 * many `agent_logs` (streaming progress lines from each task).
 *
 * Status transitions:
 *   pending → running → (paused ↔ running) → completed | failed | cancelled
 */
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),

    /** pending | running | paused | completed | failed | cancelled */
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    /** Free-form goal statement — what the user asked Arya to do. */
    goal: text("goal").notNull(),
    /** ICP + preferences supplied by the caller (industry, size, titles, …). */
    input: jsonb("input").$type<Record<string, unknown>>().default({}),
    /** Final result payload the orchestrator emits when it terminates. */
    output: jsonb("output").$type<Record<string, unknown>>(),
    /** Populated when status transitions to failed. */
    errorMessage: text("error_message"),

    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_agent_runs_user").on(t.userId),
    campaignIdx: index("idx_agent_runs_campaign").on(t.campaignId),
    statusIdx: index("idx_agent_runs_status").on(t.userId, t.status),
  })
);
