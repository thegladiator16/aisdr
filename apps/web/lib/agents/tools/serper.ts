/**
 * Serper.dev wrapper — real web research for the Research Agent.
 *
 * Serper is a Google-SERP-as-an-API service (https://serper.dev). One
 * call per (company, person) returns actual current news / funding /
 * press coverage instead of the LLM guessing what sounds plausible.
 *
 * Env: SERPER_API_KEY — get it from https://serper.dev/api-key. Free
 * tier gives 2,500 searches. When unset, isSerperConfigured() returns
 * false and the caller falls back to the Claude-only plausibility path.
 *
 * All errors surface as sanitised codes ("SERPER_HTTP_429" etc.) so the
 * caller can decide fast-fail vs. graceful degrade without leaking API
 * details.
 */

const SERPER_URL = "https://google.serper.dev/search";
const REQUEST_TIMEOUT_MS = 12_000;

export interface SerperHit {
  title: string;
  snippet: string;
  link: string;
  date: string | null;
  source: string | null;
}

export interface CompanyResearch {
  query: string;
  hits: SerperHit[];
  hooks: string[]; // 1-3 short bullets the copywriter can drop into an opener
  fundingMention: string | null;
  newsCount: number;
}

export function isSerperConfigured(): boolean {
  return !!(process.env.SERPER_API_KEY ?? "").trim();
}

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
  answerBox?: { snippet?: string; title?: string };
  knowledgeGraph?: { title?: string; description?: string; type?: string };
}

async function serperPost(query: string, num: number): Promise<SerperResponseRaw> {
  const apiKey = (process.env.SERPER_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("SERPER_NOT_CONFIGURED");

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
      // 401/403 → bad key; 429 → over quota; 5xx → their side.
      throw new Error(`SERPER_HTTP_${res.status}`);
    }
    return (await res.json()) as SerperResponseRaw;
  } finally {
    clearTimeout(timeout);
  }
}

function normaliseHit(o: SerperOrganicRaw): SerperHit | null {
  if (!o.title || !o.link) return null;
  return {
    title: o.title,
    snippet: o.snippet ?? "",
    link: o.link,
    date: o.date ?? null,
    source: o.source ?? null,
  };
}

const FUNDING_RE =
  /\b(seed|series [a-h]|pre-seed|raised|raises|funding|led by|valuation|acquired|acquires|acquisition|ipo)\b/i;

function extractHooks(hits: SerperHit[]): {
  hooks: string[];
  fundingMention: string | null;
} {
  const hooks: string[] = [];
  let fundingMention: string | null = null;

  for (const h of hits) {
    const text = `${h.title} ${h.snippet}`.trim();
    if (!text) continue;

    if (!fundingMention && FUNDING_RE.test(text)) {
      // First funding-adjacent hit becomes the funding hook.
      fundingMention = text.slice(0, 200);
      hooks.push(`Recent milestone: ${text.slice(0, 140)}`);
      continue;
    }
    if (hooks.length < 3) {
      hooks.push(text.slice(0, 140));
    }
    if (hooks.length >= 3 && fundingMention) break;
  }
  return { hooks, fundingMention };
}

/**
 * Search Serper for (company [+ personName]) recent news / announcements
 * / funding coverage. Returns hits (raw) and a distilled set of hooks
 * the copywriter can drop into a cold-email opener.
 *
 * personName is optional — if provided, added to the query so we catch
 * quotes, appointments, and interviews attributed to that person. Falls
 * back to a company-only query when person is empty.
 */
export async function searchCompany(
  company: string,
  personName?: string
): Promise<CompanyResearch> {
  const cleanCompany = company.trim();
  if (!cleanCompany) {
    return { query: "", hits: [], hooks: [], fundingMention: null, newsCount: 0 };
  }

  const person = (personName ?? "").trim();
  const query = person
    ? `"${cleanCompany}" ${person} news funding announcement`
    : `"${cleanCompany}" news funding announcement 2026`;

  const raw = await serperPost(query, 8);
  const rawHits = [...(raw.news ?? []), ...(raw.organic ?? [])];
  const hits: SerperHit[] = rawHits
    .map(normaliseHit)
    .filter((h): h is SerperHit => h !== null);

  const { hooks, fundingMention } = extractHooks(hits);
  return {
    query,
    hits: hits.slice(0, 5),
    hooks,
    fundingMention,
    newsCount: (raw.news ?? []).length,
  };
}

/**
 * Fan-out helper — one Serper call per (company, personName) pair,
 * concurrent with Promise.allSettled. Individual failures don't sink
 * the batch: the pair returns null in the errors[] slot so the
 * orchestrator can log-and-continue.
 */
export async function searchCompanies(
  targets: Array<{ company: string; personName?: string; leadIndex: number }>
): Promise<{
  results: Array<{ leadIndex: number; research: CompanyResearch | null }>;
  errors: string[];
}> {
  if (targets.length === 0) return { results: [], errors: [] };

  const settled = await Promise.allSettled(
    targets.map((t) => searchCompany(t.company, t.personName))
  );

  const results: Array<{ leadIndex: number; research: CompanyResearch | null }> = [];
  const errors: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      results.push({ leadIndex: targets[i].leadIndex, research: r.value });
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push(`${targets[i].company}: ${msg}`);
      results.push({ leadIndex: targets[i].leadIndex, research: null });
    }
  });

  return { results, errors };
}
