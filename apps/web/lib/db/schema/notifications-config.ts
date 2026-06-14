import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationsConfig = pgTable("notifications_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  notificationType: varchar("notification_type", { length: 100 }).notNull(),
  emailEnabled: boolean("email_enabled").default(true),
  slackEnabled: boolean("slack_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
