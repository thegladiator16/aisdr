import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";

export const lists = pgTable("lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  leadCount: integer("lead_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;

export const listLeads = pgTable(
  "list_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    listIdx: index("idx_list_leads_list").on(table.listId),
    listLeadUnique: uniqueIndex("idx_list_leads_list_lead_unique").on(
      table.listId,
      table.leadId
    ),
  })
);

export type ListLead = typeof listLeads.$inferSelect;
