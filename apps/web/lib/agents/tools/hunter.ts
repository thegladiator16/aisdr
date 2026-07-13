/**
 * Hunter.io Domain Search wrapper — real lead discovery for the
 * Prospecting Agent.
 *
 * Uses Node 18+ native fetch (no axios needed — this codebase already
 * ships every other outbound HTTP through fetch: Razorpay, PayPal,
 * Anthropic, etc.).
 *
 * Env: HUNTER_API_KEY — get it from https://hunter.io/api_keys. Free
 * tier is 25 searches/month; paid tiers unlock 500+ /month.
 *
 * All exported functions throw with sanitised codes ("HUNTER_HTTP_429",
 * "HUNTER_NOT_CONFIGURED", etc.) instead of raw messages — callers can
 * pattern-match without leaking Hunter's API surface to the browser.
 */

const HUNTER_BASE = "https://api.hunter.io/v2";
const REQUEST_TIMEOUT_MS = 15_000;

export interface HunterLead {
  firstName: string | null;
  lastName: string | null;
  email: string;
  position: string | null;
  company: string | null;
  domain: string;
  confidence: number;
  linkedin: string | null;
  department: string | null;
}

export function isHunterConfigured(): boolean {
  return !!(process.env.HUNTER_API_KEY ?? "").trim();
}

/* ---------------- Raw Hunter response shape ---------------- */

interface HunterEmailRaw {
  value: string;
  type?: string;
  confidence?: number;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  department?: string | null;
  linkedin?: string | null;
}

interface HunterDomainSearchResponse {
  data?: {
    domain?: string;
    organization?: string;
    emails?: HunterEmailRaw[];
  };
  errors?: Array<{ id: string; code: number; details: string }>;
}

/* ---------------- HTTP helper ---------------- */

async function hunterGet(
  params: Record<string, string>
): Promise<HunterDomainSearchResponse> {
  const apiKey = (process.env.HUNTER_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("HUNTER_NOT_CONFIGURED");

  const url = new URL(`${HUNTER_BASE}/domain-search`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      // 401 → bad key, 429 → over quota, 5xx → their side; all get
      // sanitised codes so the orchestrator can decide whether to fall
      // back or fail fast.
      throw new Error(`HUNTER_HTTP_${res.status}`);
    }
    const json = (await res.json()) as HunterDomainSearchResponse;
    if (json.errors?.length) {
      const first = json.errors[0];
      throw new Error(`HUNTER_API_${first.code}:${first.id}`);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

function toLead(
  e: HunterEmailRaw,
  domain: string,
  company: string | null
): HunterLead {
  return {
    firstName: e.first_name ?? null,
    lastName: e.last_name ?? null,
    email: e.value,
    position: e.position ?? null,
    company,
    domain,
    confidence: typeof e.confidence === "number" ? e.confidence : 0,
    linkedin: e.linkedin ?? null,
    department: e.department ?? null,
  };
}

/* ---------------- Public API ---------------- */

/**
 * Search Hunter.io by domain — the canonical mode. Handy for the case
 * where the ICP already contains a target list of company websites
 * (e.g. "run this over portfolio.a16z.com's companies"). Returns up to
 * `limit` verified email contacts.
 */
export async function findLeads(
  domain: string,
  limit = 10
): Promise<HunterLead[]> {
  const clean = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  if (!clean) return [];

  const json = await hunterGet({
    domain: clean,
    limit: String(Math.min(Math.max(limit, 1), 100)),
  });
  const emails = json.data?.emails ?? [];
  const org = json.data?.organization ?? null;
  return emails.map((e) => toLead(e, clean, org));
}

/**
 * Search Hunter.io by company NAME. Hunter maps the name to its primary
 * domain internally. When `role` is passed, filters returned leads to
 * those whose position/department fuzzily matches — if that filter
 * produces zero hits, we return all results anyway so the copywriter
 * has something to work with.
 */
export async function findByCompany(
  company: string,
  role: string | undefined,
  limit = 10
): Promise<HunterLead[]> {
  const name = company.trim();
  if (!name) return [];

  const json = await hunterGet({
    company: name,
    limit: String(Math.min(Math.max(limit, 1), 100)),
  });
  const emails = json.data?.emails ?? [];
  const domain = json.data?.domain ?? "";
  const org = json.data?.organization ?? name;
  let leads = emails.map((e) => toLead(e, domain, org));

  if (role && leads.length > 0) {
    const roleTokens = role
      .toLowerCase()
      .split(/[\s,/]+/)
      .filter((t) => t.length > 2);
    const matched = leads.filter((l) => {
      const p = (l.position ?? "").toLowerCase();
      const d = (l.department ?? "").toLowerCase();
      return roleTokens.some((tok) => p.includes(tok) || d.includes(tok));
    });
    // Only substitute the filtered set if it produced hits — otherwise
    // "founder" over a big co with no C-suite in Hunter's index would
    // return an empty prospecting result instead of a partial one.
    if (matched.length > 0) leads = matched;
  }

  return leads.slice(0, limit);
}

/**
 * Fan-out helper — given a batch of candidate company names (typically
 * produced by an LLM given the ICP), calls findByCompany for each in
 * parallel with Promise.allSettled. Individual failures don't sink the
 * batch: they're returned in the errors[] channel so the orchestrator
 * can log them without aborting the run.
 *
 * Results are deduped by email (Hunter occasionally returns the same
 * person under two subsidiary brand searches) and sorted by confidence
 * descending so the copywriter sees the best leads first.
 */
export async function findByCompanies(
  companies: string[],
  role: string | undefined,
  perCompanyLimit = 3,
  totalLimit = 20
): Promise<{ leads: HunterLead[]; errors: string[] }> {
  if (companies.length === 0) return { leads: [], errors: [] };

  const settled = await Promise.allSettled(
    companies.map((c) => findByCompany(c, role, perCompanyLimit))
  );

  const all: HunterLead[] = [];
  const errors: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push(`${companies[i]}: ${msg}`);
    }
  });

  // Dedupe by lowercase email.
  const seen = new Set<string>();
  const deduped: HunterLead[] = [];
  for (const l of all) {
    const key = l.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(l);
  }

  deduped.sort((a, b) => b.confidence - a.confidence);
  return { leads: deduped.slice(0, totalLimit), errors };
}
