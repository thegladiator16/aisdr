import { pgTable, uuid, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const onboardingQuests = pgTable("onboarding_quests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questKey: varchar("quest_key", { length: 100 }).notNull(),
  completed: boolean("completed").default(false),
  creditsEarned: integer("credits_earned").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
