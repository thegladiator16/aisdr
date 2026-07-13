import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { agentRuns } from "./agent-runs";

/**
 * One row per agent invocation within a run. Six + orchestrator = up to 7
 * per run, more if the orchestrator loops (e.g., research → copywriter for
 * each lead).
 *
 * Status transitions: pending → running → completed | failed | skipped
 */
export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),

    /** e.g. "orchestrator", "prospecting", "research", "copywriter", … */
    agentName: varchar("agent_name", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),

    /** Serialized inputs the agent received (structured). */
    input: jsonb("input").$type<Record<string, unknown>>().default({}),
    /** Serialized outputs the agent produced (structured). */
    output: jsonb("output").$type<Record<string, unknown>>(),
    /** Populated on failure. */
    errorMessage: text("error_message"),

    /** Sequence within the run — orchestrator sets on task creation so the
     *  UI can render tasks in the same order the graph visited them. */
    sequence: integer("sequence").notNull().default(0),

    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    runIdx: index("idx_agent_tasks_run").on(t.runId),
    agentIdx: index("idx_agent_tasks_agent").on(t.agentName, t.status),
  })
);
