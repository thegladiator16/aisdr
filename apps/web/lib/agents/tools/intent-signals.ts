/**
 * Intent-signal detection — funding rounds, hiring activity, and tech
 * stack signals for the Research Agent.
 *
 * Builds on the Serper.dev search API (same key as serper.ts) to find
 * buying-intent indicators: recent funding events, open SDR/BDR roles,
 * and technology footprints. The Prospecting Agent uses these to
 * prioritise outreach toward companies that are actively growing.
 *
 * Env: SERPER_API_KEY — same key used by serper.ts. When unset,
 * isSerperConfigured() (re-exported here) returns false and the caller
 * falls back to the Claude-only plausibility path.
 *
 * All errors surface as sanitised codes ("SIGNAL_HTTP_429" etc.) so the
 * caller can decide fast-fail vs. graceful degrade.
 */

const SERPER_URL = "https://google.serper.dev/search";
const REQUEST_TIMEOUT_MS = 15_000;

export { isSerperConfigured } from "./serper";

export interface FundingSignal {
  company: string;
  amount: string;
  round: string;
  date: string;
  source: string;
}

export interface HiringSignal {
  company: string;
  role: string;
  postedDate: string;
  source: string;
}

export interface TechStackSignal {
  domain: string;
  technologies: string[];
}

/* ---------------- Raw Serper response shape ---------------- */

interface SerperOrganicRaw {
  title?: string;
  snippet?: string;
  link?: string;
  date?: string;
  source?: string;
}

interface SerperResponseRaw {
  organic?: SerperOrganicRaw[];
  news?: SerperOrganicRaw[];
}

/* ---------------- HTTP helper ---------------- */

async function serperSearch(query: string, num = 10): Promise<SerperResponseRaw> {
  const apiKey = (process.env.SERPER_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("SIGNAL_NOT_CONFIGURED");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`SIGNAL_HTTP_${res.status}`);
    }
    return (await res.json()) as SerperResponseRaw;
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------- Parsing helpers ---------------- */

const FUNDING_RE =
  /\b(seed|pre-seed|series\s*[a-h]|raised|raises|funding|round|led by|valuation)\b/i;
const AMOUNT_RE = /\$[\d.,]+\s*[bmk](?:illion)?/i;
const ROUND_RE = /\b(seed|pre-seed|series\s*[a-h])\b/i;

function parseFundingHit(
  company: string,
  hit: SerperOrganicRaw
): FundingSignal | null {
  const text = `${hit.title ?? ""} ${hit.snippet ?? ""}`;
  if (!FUNDING_RE.test(text)) return null;

  const amountMatch = text.match(AMOUNT_RE);
  const roundMatch = text.match(ROUND_RE);

  return {
    company,
    amount: amountMatch ? amountMatch[0] : "undisclosed",
    round: roundMatch ? roundMatch[0].trim() : "unknown",
    date: hit.date ?? "",
    source: hit.link ?? "",
  };
}

const HIRING_RE =
  /\b(hiring|job|career|open role|we.re looking|join our|apply now|SDR|BDR|sales development|business development)\b/i;

function parseHiringHit(
  company: string,
  hit: SerperOrganicRaw
): HiringSignal | null {
  const text = `${hit.title ?? ""} ${hit.snippet ?? ""}`;
  if (!HIRING_RE.test(text)) return null;

  const title = hit.title ?? "";
  const roleMatch = title.replace(new RegExp(company, "gi"), "").trim();

  return {
    company,
    role: roleMatch || "sales/BDR role",
    postedDate: hit.date ?? "",
    source: hit.link ?? "",
  };
}

const TECH_RE =
  /\b(React|Angular|Vue|Next\.?js|Node\.?js|Python|Django|Rails|Ruby|PHP|Laravel|WordPress|Shopify|Salesforce|HubSpot|Marketo|Segment|Stripe|AWS|Azure|GCP|Google Cloud|Cloudflare|Vercel|Netlify|Docker|Kubernetes|PostgreSQL|MongoDB|Redis|Elasticsearch|Snowflake|BigQuery|Terraform|GraphQL|TypeScript|Go|Rust|Java|\.NET|Swift|Kotlin)\b/gi;

/* ---------------- Public API ---------------- */

/**
 * Search for recent funding events for a batch of companies. For each
 * company, queries Serper for "{company} funding round 2026" and parses
 * results for amount, round type, and date.
 */
export async function getFundingSignals(
  companies: string[]
): Promise<FundingSignal[]> {
  if (companies.length === 0) return [];

  const settled = await Promise.allSettled(
    companies.map(async (company) => {
      const name = company.trim();
      if (!name) return [];
      const raw = await serperSearch(`"${name}" funding round 2026`, 5);
      const hits = [...(raw.news ?? []), ...(raw.organic ?? [])];
      return hits
        .map((h) => parseFundingHit(name, h))
        .filter((s): s is FundingSignal => s !== null);
    })
  );

  const signals: FundingSignal[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") signals.push(...r.value);
  }
  return signals;
}

/**
 * Search for active hiring signals (SDR/BDR/sales roles) for a batch
 * of companies. Indicates a company is scaling its sales org — a strong
 * buying-intent signal.
 */
export async function getHiringSignals(
  companies: string[]
): Promise<HiringSignal[]> {
  if (companies.length === 0) return [];

  const settled = await Promise.allSettled(
    companies.map(async (company) => {
      const name = company.trim();
      if (!name) return [];
      const raw = await serperSearch(`"${name}" hiring sales SDR BDR 2026`, 5);
      const hits = [...(raw.organic ?? [])];
      return hits
        .map((h) => parseHiringHit(name, h))
        .filter((s): s is HiringSignal => s !== null);
    })
  );

  const signals: HiringSignal[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") signals.push(...r.value);
  }
  return signals;
}

/**
 * Detect the technology stack for a domain by searching for BuiltWith
 * or similar tech-profile pages, then extracting known technology names
 * from the results. Returns null when no tech information is found.
 */
export async function getTechStackSignals(
  domain: string
): Promise<TechStackSignal | null> {
  const clean = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  if (!clean) return null;

  const raw = await serperSearch(
    `site:builtwith.com "${clean}" OR "${clean}" technology stack`,
    8
  );

  const allText = [...(raw.organic ?? [])]
    .map((h) => `${h.title ?? ""} ${h.snippet ?? ""}`)
    .join(" ");

  const matches = allText.match(TECH_RE);
  if (!matches || matches.length === 0) return null;

  const unique = Array.from(new Set(matches.map((t) => t.trim())));
  return { domain: clean, technologies: unique };
}
