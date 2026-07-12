import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { promises as dns } from "dns";

export const runtime = "nodejs";

// Per-lookup timeout so a slow/unresponsive DNS server can't stall the request.
const LOOKUP_TIMEOUT_MS = 5000;

const DKIM_SELECTORS = [
  "google",
  "mail",
  "default",
  "selector1",
  "selector2",
  "k1",
  "key1",
];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("DNS_TIMEOUT")), ms)
    ),
  ]);
}

function flattenTxt(records: string[][]): string[] {
  return records.map((chunks) => chunks.join(""));
}

function isValidDomain(input: string): boolean {
  if (!input) return false;
  if (input.length > 253) return false;
  if (/^https?:\/\//i.test(input)) return false;
  if (input.includes("/") || input.includes(" ")) return false;
  if (!input.includes(".")) return false;
  // Basic label check.
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    input
  );
}

type MxRecord = { exchange: string; priority: number };

type SpfInfo = {
  found: boolean;
  raw?: string;
  mechanisms?: string[];
  insecure?: boolean;
};

type DmarcInfo = {
  found: boolean;
  raw?: string;
  policy?: string;
};

type DkimInfo = {
  selectorsFound: { selector: string; raw: string }[];
};

async function lookupMx(domain: string): Promise<MxRecord[]> {
  try {
    const records = await withTimeout(dns.resolveMx(domain), LOOKUP_TIMEOUT_MS);
    return records
      .map((r) => ({ exchange: r.exchange, priority: r.priority }))
      .sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

async function lookupSpf(domain: string): Promise<SpfInfo> {
  try {
    const raw = await withTimeout(dns.resolveTxt(domain), LOOKUP_TIMEOUT_MS);
    const joined = flattenTxt(raw);
    const spf = joined.find((r) => r.toLowerCase().startsWith("v=spf1"));
    if (!spf) return { found: false };
    const mechanisms = spf
      .split(/\s+/)
      .filter((tok) => tok && !tok.toLowerCase().startsWith("v=spf1"));
    const insecure = /\+all\b/i.test(spf);
    return { found: true, raw: spf, mechanisms, insecure };
  } catch {
    return { found: false };
  }
}

async function lookupDmarc(domain: string): Promise<DmarcInfo> {
  try {
    const raw = await withTimeout(
      dns.resolveTxt(`_dmarc.${domain}`),
      LOOKUP_TIMEOUT_MS
    );
    const joined = flattenTxt(raw);
    const dmarc = joined.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
    if (!dmarc) return { found: false };
    const policyMatch = dmarc.match(/\bp=([a-zA-Z]+)/);
    const policy = policyMatch ? policyMatch[1].toLowerCase() : undefined;
    return { found: true, raw: dmarc, policy };
  } catch {
    return { found: false };
  }
}

async function lookupDkim(domain: string): Promise<DkimInfo> {
  const results: { selector: string; raw: string }[] = [];
  await Promise.all(
    DKIM_SELECTORS.map(async (selector) => {
      try {
        const raw = await withTimeout(
          dns.resolveTxt(`${selector}._domainkey.${domain}`),
          LOOKUP_TIMEOUT_MS
        );
        const joined = flattenTxt(raw);
        const dkim = joined.find((r) => /v=dkim1/i.test(r));
        if (dkim) results.push({ selector, raw: dkim });
      } catch {
        // silent — ENOTFOUND / timeout just means "not this selector"
      }
    })
  );
  return { selectorsFound: results };
}

export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: unknown };
  try {
    body = (await req.json()) as { domain?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawDomain =
    typeof body.domain === "string" ? body.domain.trim().toLowerCase() : "";
  if (!isValidDomain(rawDomain)) {
    return NextResponse.json(
      {
        error:
          "Invalid domain. Enter something like example.com — no protocol.",
      },
      { status: 400 }
    );
  }
  const domain = rawDomain;

  const [mx, spf, dmarc, dkim] = await Promise.all([
    lookupMx(domain),
    lookupSpf(domain),
    lookupDmarc(domain),
    lookupDkim(domain),
  ]);

  // Score: start at 100, subtract for missing / weak configuration.
  let score = 100;
  const summary: string[] = [];

  if (mx.length === 0) {
    score -= 30;
    summary.push("No MX records — this domain has no mail server configured.");
  } else {
    summary.push(
      `MX records found (${mx.length}). Lowest priority: ${mx[0].exchange}.`
    );
  }

  if (!spf.found) {
    score -= 20;
    summary.push("No SPF record — receivers can't verify authorized senders.");
  } else if (spf.insecure) {
    summary.push(
      "SPF exists but uses '+all', which permits any server to send as your domain — insecure."
    );
  } else {
    summary.push("SPF record present.");
  }

  if (!dmarc.found) {
    score -= 25;
    summary.push("No DMARC record — no policy for handling unauthenticated mail.");
  } else if (dmarc.policy === "none" || !dmarc.policy) {
    score -= 25;
    summary.push(
      `DMARC present but policy is '${dmarc.policy ?? "unspecified"}' — receivers won't enforce.`
    );
  } else if (dmarc.policy === "reject") {
    summary.push("DMARC policy is 'reject' — strongest protection.");
  } else if (dmarc.policy === "quarantine") {
    summary.push("DMARC policy is 'quarantine' — good, consider tightening to 'reject'.");
  } else {
    summary.push(`DMARC policy: ${dmarc.policy}.`);
  }

  if (dkim.selectorsFound.length === 0) {
    score -= 15;
    summary.push(
      "No DKIM configured for common selectors. Domain may use a custom selector — check with your ESP."
    );
  } else {
    summary.push(
      `DKIM found on selector${dkim.selectorsFound.length > 1 ? "s" : ""}: ${dkim.selectorsFound
        .map((s) => s.selector)
        .join(", ")}.`
    );
  }

  const scoreOutOf100 = Math.max(0, Math.min(100, score));

  return NextResponse.json({
    domain,
    mx,
    spf,
    dmarc,
    dkim,
    scoreOutOf100,
    summary,
  });
}
