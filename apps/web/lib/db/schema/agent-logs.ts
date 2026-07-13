import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { agentTasks } from "./agent-tasks";

export const agentLogs = pgTable("agent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => agentTasks.id, { onDelete: "cascade" }),
  level: varchar("level", { length: 16 }).notNull().default("info"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  taskIdx: index("idx_agent_logs_task").on(t.taskId, t.createdAt),
}));
