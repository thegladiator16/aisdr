import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { agentTasks } from "./agent-tasks";

/**
 * Streaming progress lines each agent emits as it works. Powers the
 * real-time Agent Activity feed. Cheap append-only; older lines can be
 * pruned by a maintenance job if the table grows too large.
 */
export const agentLogs = pgTable(
  "agent_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => agentTasks.id, { onDelete: "cascade" }),

    /** info | warn | error | debug */
    level: varchar("level", { length: 16 }).notNull().default("info"),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    taskIdx: index("idx_agent_logs_task").on(t.taskId, t.createdAt),
  })
);
