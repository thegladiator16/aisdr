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
  // taskType conventions (enforced via zod .enum() at the API layer):
  //   "outbound_approval" — AI-drafted outreach message awaiting human
  //                          approval; backs the "Outbound to approve" tab.
  //   "manual"             — a manually-created follow-up task; backs the
  //                          "Manual tasks" tab.
  //   "platform"           — a system/platform-generated task; backs the
  //                          "Platform tasks" tab.
  taskType: varchar("task_type", { length: 50 }).default("outbound_approval"),
  // status conventions (enforced via zod .enum() at the API layer):
  //   "pending"   — awaiting action (the default for new tasks).
  //   "scheduled" — approved/scheduled for send (set by the approve and
  //                 schedule actions on PATCH /api/tasks/[id]).
  // A rejected task is deleted outright rather than flagged, so no
  // "rejected" status value is persisted.
  status: varchar("status", { length: 50 }).default("pending"),
  message: text("message"),
  // When this task/message is scheduled to go out. Set by the "schedule"
  // action; also usable for date-range filtering.
  dueDate: timestamp("due_date", { withTimezone: true }),
  // Who this task is assigned to. Nullable — most tasks are implicitly
  // owned by the account owner (userId); this is a real (if currently
  // single-option, single-tenant) assignee field for future multi-user use.
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
