import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { teamMembers } from "./team";

// Round-robin/criteria based lead routing. When a fresh lead lands
// (via API upload, form-fill, intent signal), we walk these rules in
// ascending priority order and hand the lead to the first matching
// team member. Wiring into POST /api/leads is intentionally deferred —
// this table + the evaluator gives us the engine, we plug it in when
// there's a real lead-create flow that needs assignment.
export const leadRoutingRules = pgTable(
  "lead_routing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Lower number runs first. Ties resolved by createdAt (older wins),
    // matching how most CRMs (Salesforce, HubSpot) order routing rules.
    priority: integer("priority").default(100).notNull(),

    // All keys are optional. Semantics: AND across present keys.
    // Recognised keys (all optional):
    //   industry: string (exact case-insensitive match on leads.industry)
    //   region: string   (exact case-insensitive match on leads.country)
    //   seniority: string (exact case-insensitive match on leads.seniority)
    //   minCompanySize: number (parses leads.companySize's leading integer)
    //   maxCompanySize: number (same source)
    //   jobTitleContains: string (case-insensitive substring)
    matchCriteria: jsonb("match_criteria")
      .$type<Record<string, string | number | undefined>>()
      .notNull(),

    // Null means "nobody gets it" — mostly useful for pausing a rule
    // without deleting it; if a matching rule has null we fall through
    // to the next-priority rule instead.
    assignToTeamMemberId: uuid("assign_to_team_member_id").references(
      () => teamMembers.id,
      { onDelete: "set null" }
    ),

    enabled: boolean("enabled").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ownerIdx: index("idx_lead_routing_rules_owner").on(table.ownerUserId),
  })
);

export type LeadRoutingRule = typeof leadRoutingRules.$inferSelect;
export type NewLeadRoutingRule = typeof leadRoutingRules.$inferInsert;
