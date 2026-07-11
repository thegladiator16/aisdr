import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// A single unifying table for the 12 user-configurable "list of items"
// widgets on the Manage Arya dashboard page: coaching points, proof
// highlights/customers/case-studies, custom escalation rules, knowledge
// base entries, reply coaching, qualification criteria, DNC lists
// (emails/domains/phones), and banned phrases.
//
// Every widget is structurally the same thing — a user-owned, categorized
// list of {title, content?} rows — so they all share this one row shape
// keyed by `category`. The exact category slugs are the ones the frontend
// passes via ?category=... and are locked into the zod validator on the
// POST handler; see app/api/agent-config/route.ts.
export const agentConfigItems = pgTable(
  "agent_config_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // One of the 12 slugs below. Validated at the API layer.
    //   coaching_point           — Outbound > Knowledge > coaching points
    //   proof_highlight          — Outbound > Knowledge > proof (Highlights)
    //   proof_customer           — Outbound > Knowledge > proof (Customers)
    //   proof_case_study         — Outbound > Knowledge > proof (Case studies)
    //   escalation_rule          — Autonomous replies > escalation (custom)
    //   knowledge_item           — Autonomous replies > knowledge base
    //   reply_coaching           — Autonomous replies > reply coaching
    //   qualification_criterion  — Autonomous replies > qualification criteria
    //   dnc_email                — Guardrails > DNC > Email addresses
    //   dnc_domain               — Guardrails > DNC > Company domains
    //   dnc_phone                — Guardrails > DNC > Phone numbers
    //   banned_phrase            — Guardrails > Banned phrases
    //   objection_response       — Autonomous replies > Objection responses
    //                              (title = the objection quote,
    //                               content = the recommended response)
    category: varchar("category", { length: 50 }).notNull(),
    // For DNC and banned-phrase categories, this IS the value itself
    // (the email address, domain, phone number, or phrase). For
    // "title+content" categories (knowledge / reply_coaching /
    // qualification / proof_customer / proof_case_study), this is the
    // display title/headline. Never empty.
    title: varchar("title", { length: 1000 }).notNull(),
    // Optional body/description. Null for simple string-only categories
    // (DNC entries, banned phrases, escalation rules, proof highlights,
    // coaching points).
    content: text("content"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCategoryIdx: index("idx_agent_config_user_category").on(
      table.userId,
      table.category
    ),
  })
);

export type AgentConfigItem = typeof agentConfigItems.$inferSelect;
export type NewAgentConfigItem = typeof agentConfigItems.$inferInsert;

// The exact set of accepted category slugs. Kept alongside the schema so
// the route file, the frontend, and this file all agree on the source of
// truth. Order matches the UI section order top-to-bottom.
export const AGENT_CONFIG_CATEGORIES = [
  "coaching_point",
  "proof_highlight",
  "proof_customer",
  "proof_case_study",
  "escalation_rule",
  "knowledge_item",
  "reply_coaching",
  "qualification_criterion",
  "dnc_email",
  "dnc_domain",
  "dnc_phone",
  "banned_phrase",
  "objection_response",
] as const;

export type AgentConfigCategory = (typeof AGENT_CONFIG_CATEGORIES)[number];
