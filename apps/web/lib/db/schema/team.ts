import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// A role owned by one account (the inviting/paying user). Two system rows
// ("Admin", "Member") are lazily seeded per owner the first time the owner's
// Access Controls or Team page is loaded — see app/api/team/roles/route.ts.
// Custom roles created via the "New role" modal are isSystem: false.
export const teamRoles = pgTable("team_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  isSystem: boolean("is_system").default(false),
  // Record<FeatureKey, boolean> — campaigns, manageArya, inboxTasks,
  // integrations, userManagement, accessTeam, creditPurchasing, billing.
  permissions: jsonb("permissions")
    .$type<Record<string, boolean>>()
    .default({})
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TeamRole = typeof teamRoles.$inferSelect;
export type NewTeamRole = typeof teamRoles.$inferInsert;

// A person invited to help manage one owner's account. This app is
// single-tenant-per-account (no Clerk Organizations) — invited members act on
// behalf of the owning account, they are not separate tenants. `roleName` is
// a plain string reference to a teamRoles.name row for the same owner (not a
// hard FK, since role names aren't globally unique).
export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  roleName: varchar("role_name", { length: 100 }).notNull(),
  // 'invited' | 'active' | 'revoked'
  status: varchar("status", { length: 50 }).default("invited"),
  inviteToken: varchar("invite_token", { length: 64 }).unique(),
  addAsSender: boolean("add_as_sender").default(true),
  invitedAt: timestamp("invited_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  // Set once the invited person actually signs in and accepts the invite.
  acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
