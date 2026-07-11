import { sql, and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leadRoutingRules } from "@aisdr/db/schema";
import type { Lead } from "@aisdr/db/schema";

// Runtime DDL guard for lead_routing_rules. See team/_lib.ts for the
// pattern rationale (not touching shared ensure-schema.ts).
let leadRoutingSchemaEnsured = false;
export async function ensureLeadRoutingSchema() {
  if (leadRoutingSchemaEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_routing_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        priority integer DEFAULT 100 NOT NULL,
        match_criteria jsonb NOT NULL,
        assign_to_team_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
        enabled boolean DEFAULT true NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_lead_routing_rules_owner ON lead_routing_rules(owner_user_id)`
    );
    leadRoutingSchemaEnsured = true;
  } catch (err) {
    console.error("[ensure-schema] lead_routing_rules failed:", err);
  }
}

// Whitelisted match-criteria keys. Any key outside this list is
// silently ignored on validate — keeps the rule table forward-compatible
// but stops the client from smuggling arbitrary jsonb in.
export const KNOWN_CRITERIA_KEYS = [
  "industry",
  "region",
  "seniority",
  "minCompanySize",
  "maxCompanySize",
  "jobTitleContains",
] as const;

export type MatchCriteria = {
  industry?: string;
  region?: string;
  seniority?: string;
  minCompanySize?: number;
  maxCompanySize?: number;
  jobTitleContains?: string;
};

export function sanitizeMatchCriteria(
  input: Record<string, unknown>
): MatchCriteria {
  const out: MatchCriteria = {};
  for (const key of KNOWN_CRITERIA_KEYS) {
    const v = input[key];
    if (v === undefined || v === null || v === "") continue;
    if (key === "minCompanySize" || key === "maxCompanySize") {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[key] = n;
    } else if (typeof v === "string") {
      out[key] = v.trim();
    }
  }
  return out;
}

// leads.companySize is a free-text column ("50-200", "1000+", "50"),
// so pull the leading integer for numeric comparisons. Returns null
// if we can't parse a number — those leads simply won't match a
// min/max-companySize rule.
function parseCompanySize(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = /(\d+)/.exec(raw);
  return m ? Number(m[1]) : null;
}

function eqi(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function matchesCriteria(lead: Lead, criteria: MatchCriteria): boolean {
  // AND semantics: every criteria that IS present must match.
  // Absent criteria = wildcard.
  if (criteria.industry && !eqi(lead.industry, criteria.industry)) return false;
  if (criteria.region && !eqi(lead.country, criteria.region)) return false;
  if (criteria.seniority && !eqi(lead.seniority, criteria.seniority))
    return false;

  if (
    criteria.jobTitleContains &&
    (!lead.jobTitle ||
      !lead.jobTitle
        .toLowerCase()
        .includes(criteria.jobTitleContains.toLowerCase()))
  ) {
    return false;
  }

  if (
    criteria.minCompanySize !== undefined ||
    criteria.maxCompanySize !== undefined
  ) {
    const size = parseCompanySize(lead.companySize);
    if (size === null) return false;
    if (
      criteria.minCompanySize !== undefined &&
      size < criteria.minCompanySize
    )
      return false;
    if (
      criteria.maxCompanySize !== undefined &&
      size > criteria.maxCompanySize
    )
      return false;
  }

  return true;
}

// routeLeadToMember walks the owner's enabled rules in priority order
// (ties broken by createdAt) and returns the assigned team-member id
// from the first matching rule. Returns null if no rule matches or
// the matching rule intentionally has no assignee set.
//
// Not wired into POST /api/leads for this pass — see the schema
// header comment; a follow-up PR can call this from the lead-create
// flow (form-fill, CSV upload, intent-signal ingest) once we decide
// where the actual "assign" side-effect lives (a leads.assignedToId
// column, or a separate assignments table).
export async function routeLeadToMember(
  userId: string,
  lead: Lead
): Promise<string | null> {
  await ensureLeadRoutingSchema();

  const rules = await db
    .select()
    .from(leadRoutingRules)
    .where(
      and(
        eq(leadRoutingRules.ownerUserId, userId),
        eq(leadRoutingRules.enabled, true)
      )
    );

  // Sort in-memory: priority ASC, createdAt ASC. Cheap for the
  // handful of rules a customer typically defines, and keeps the
  // DB query index-friendly (single ownerUserId filter).
  rules.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });

  for (const rule of rules) {
    const criteria = (rule.matchCriteria ?? {}) as MatchCriteria;
    if (matchesCriteria(lead, criteria)) {
      return rule.assignToTeamMemberId ?? null;
    }
  }
  return null;
}
