import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";
import { campaigns } from "./campaigns";

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, {
    onDelete: "set null",
  }),
  taskType: varchar("task_type", { length: 50 }).default("outbound_approval"),
  status: varchar("status", { length: 50 }).default("pending"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
