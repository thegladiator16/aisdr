import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { agentRuns } from "./agent-runs";

export const agentTasks = pgTable("agent_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => agentRuns.id, { onDelete: "cascade" }),
  agentName: varchar("agent_name", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  output: jsonb("output").$type<Record<string, unknown>>(),
  errorMessage: text("error_message"),
  sequence: integer("sequence").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  runIdx: index("idx_agent_tasks_run").on(t.runId),
  agentIdx: index("idx_agent_tasks_agent").on(t.agentName, t.status),
}));
