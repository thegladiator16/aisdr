/**
 * Apollo.io People Search wrapper — enriched lead discovery for the
 * Prospecting Agent.
 *
 * Uses Node 18+ native fetch. Apollo's v1 API provides people search,
 * enrichment, and company-scoped lead lookups that complement Hunter's
 * domain-only approach with title / industry / location filters.
 *
 * Env: APOLLO_API_KEY — get it from https://app.apollo.io/#/settings/integrations/api.
 *
 * All exported functions throw with sanitised codes ("APOLLO_HTTP_429",
 * "APOLLO_NOT_CONFIGURED", etc.) so callers can pattern-match without
 * leaking Apollo's API surface to the browser.
 */

const APOLLO_BASE = "https://api.apollo.io/v1";
const REQUEST_TIMEOUT_MS = 15_000;

export interface ApolloLead {
  firstName: string | null;
  lastName: string | null;
  email: string;
  title: string | null;
  company: string | null;
  linkedin: string | null;
  phone: string | null;
  industry: string | null;
  employeeCount: number | null;
  domain: string | null;
}

export function isApolloConfigured(): boolean {
  return !!(process.env.APOLLO_API_KEY ?? "").trim();
}

/* ---------------- Raw Apollo response shapes ---------------- */

interface ApolloPersonRaw {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  title?: string | null;
  linkedin_url?: string | null;
  phone_numbers?: Array<{ sanitized_number?: string }>;
  organization?: {
    name?: string | null;
    industry?: string | null;
    estimated_num_employees?: number | null;
    primary_domain?: string | null;
  };
}

interface ApolloSearchResponse {
  people?: ApolloPersonRaw[];
}

interface ApolloMatchResponse {
  person?: ApolloPersonRaw | null;
}

/* ---------------- HTTP helper ---------------- */

async function apolloPost(
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const apiKey = (process.env.APOLLO_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("APOLLO_NOT_CONFIGURED");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${APOLLO_BASE}${path}`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`APOLLO_HTTP_${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function toLead(p: ApolloPersonRaw): ApolloLead | null {
  const email = (p.email ?? "").trim();
  if (!email) return null;
  return {
    firstName: p.first_name ?? null,
    lastName: p.last_name ?? null,
    email,
    title: p.title ?? null,
    company: p.organization?.name ?? null,
    linkedin: p.linkedin_url ?? null,
    phone: p.phone_numbers?.[0]?.sanitized_number ?? null,
    industry: p.organization?.industry ?? null,
    employeeCount: p.organization?.estimated_num_employees ?? null,
    domain: p.organization?.primary_domain ?? null,
  };
}

/* ---------------- Public API ---------------- */

/**
 * Search Apollo's people database with ICP-style filters — job titles,
 * industries, locations, and company size. Returns up to `limit` leads
 * (default 20, max 100).
 */
export async function searchPeople(params: {
  jobTitles?: string[];
  industries?: string[];
  locations?: string[];
  companySize?: string;
  limit?: number;
}): Promise<ApolloLead[]> {
  const body: Record<string, unknown> = {
    per_page: Math.min(Math.max(params.limit ?? 20, 1), 100),
  };
  if (params.jobTitles?.length) body.person_titles = params.jobTitles;
  if (params.locations?.length) body.person_locations = params.locations;
  if (params.industries?.length)
    body.q_organization_industries = params.industries;
  if (params.companySize) body.organization_num_employees_ranges = [params.companySize];

  const json = (await apolloPost(
    "/mixed_people/search",
    body
  )) as ApolloSearchResponse;

  return (json.people ?? [])
    .map(toLead)
    .filter((l): l is ApolloLead => l !== null);
}

/**
 * Enrich a single person by email, name, and/or domain. Returns the
 * matched lead or null when Apollo has no data.
 */
export async function enrichPerson(params: {
  email?: string;
  name?: string;
  domain?: string;
}): Promise<ApolloLead | null> {
  const body: Record<string, unknown> = {};
  if (params.email) body.email = params.email;
  if (params.domain) body.organization_domain = params.domain;
  if (params.name) {
    const parts = params.name.trim().split(/\s+/);
    body.first_name = parts[0] ?? "";
    body.last_name = parts.slice(1).join(" ") || undefined;
  }

  const json = (await apolloPost("/people/match", body)) as ApolloMatchResponse;
  if (!json.person) return null;
  return toLead(json.person);
}

/**
 * Enrich a company by domain — returns org-level data (name, industry,
 * employee count, description) or null when Apollo has no data. Used by
 * the visitor tracker to identify anonymous website visitors by IP→domain.
 */
export async function enrichCompany(domain: string): Promise<{
  name: string | null;
  industry: string | null;
  employeeCount: number | null;
  domain: string;
  description: string | null;
  linkedinUrl: string | null;
} | null> {
  const json = (await apolloPost("/organizations/enrich", {
    domain: domain.trim(),
  })) as {
    organization?: {
      name?: string | null;
      industry?: string | null;
      estimated_num_employees?: number | null;
      primary_domain?: string | null;
      short_description?: string | null;
      linkedin_url?: string | null;
    } | null;
  };

  const org = json.organization;
  if (!org) return null;

  return {
    name: org.name ?? null,
    industry: org.industry ?? null,
    employeeCount: org.estimated_num_employees ?? null,
    domain: org.primary_domain ?? domain,
    description: org.short_description ?? null,
    linkedinUrl: org.linkedin_url ?? null,
  };
}

/**
 * Fan-out helper — given a batch of company names, searches Apollo for
 * leads at each company in parallel with Promise.allSettled. Individual
 * failures don't sink the batch: they're returned in errors[] so the
 * orchestrator can log them without aborting the run.
 *
 * Results are deduped by email.
 */
export async function findByCompanies(
  companies: string[],
  role?: string,
  limit = 5
): Promise<{ leads: ApolloLead[]; errors: string[] }> {
  if (companies.length === 0) return { leads: [], errors: [] };

  const settled = await Promise.allSettled(
    companies.map((company) => {
      const body: Record<string, unknown> = {
        q_organization_name: company.trim(),
        per_page: Math.min(Math.max(limit, 1), 100),
      };
      if (role) body.person_titles = [role];
      return apolloPost("/mixed_people/search", body).then((json) =>
        ((json as ApolloSearchResponse).people ?? [])
          .map(toLead)
          .filter((l): l is ApolloLead => l !== null)
      );
    })
  );

  const all: ApolloLead[] = [];
  const errors: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      const msg =
        r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push(`${companies[i]}: ${msg}`);
    }
  });

  const seen = new Set<string>();
  const deduped: ApolloLead[] = [];
  for (const l of all) {
    const key = l.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(l);
  }

  return { leads: deduped, errors };
}
