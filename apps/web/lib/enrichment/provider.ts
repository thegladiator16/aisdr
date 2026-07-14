/**
 * Pluggable enrichment provider abstraction.
 *
 * Apollo/ZoomInfo-style lead enrichment requires an external
 * vendor account with an API key, and none of those are connected on this
 * deployment. Rather than half-hardcoding a mock, we ship the abstraction now
 * so:
 *
 *   1. The UI can honestly report "enrichment provider not configured" (via
 *      `isConfigured()` / the /api/enrichment/status endpoint) instead of
 *      lying about capabilities we don't have.
 *   2. Adding a real vendor later is a matter of implementing this interface
 *      and wiring it into `getEnrichmentProvider()` — no route or UI churn.
 *   3. Users can still enrich leads manually via the notes / research summary
 *      / CSV import paths — those don't touch this file.
 *
 * The stubs below intentionally throw sanitized error codes
 * (e.g. "APOLLO_NOT_IMPLEMENTED"). Callers MUST NOT surface those error
 * strings to the browser — match the Razorpay pattern in
 * `lib/payments/razorpay.ts`: gate on `isConfigured()` first and return a
 * friendly "not configured" JSON response. Any raw throw is a bug that leaks
 * internal provider names.
 */

export type EnrichmentResult = {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  seniority?: string;
  companyName?: string;
  companyWebsite?: string;
  companySize?: string;
  industry?: string;
  location?: string;
  country?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
};

export interface EnrichmentProvider {
  /** Stable identifier for the provider — used in status responses and logs. */
  readonly name: string;
  /** Non-throwing config check. Callers gate on this before enrich* calls. */
  isConfigured(): boolean;
  /** Look up a person by email. Returns null when the provider has no match. */
  enrichByEmail(email: string): Promise<EnrichmentResult | null>;
  /** Look up a company by domain. Returns null when the provider has no match. */
  enrichByDomain(domain: string): Promise<EnrichmentResult | null>;
}

/* ------------------------------------------------------------------ */
/*  NullProvider                                                       */
/* ------------------------------------------------------------------ */

/**
 * No-op provider used when ENRICHMENT_PROVIDER is unset or unrecognized.
 * `isConfigured()` returns false so the UI can render its friendly banner,
 * and both enrich methods resolve to null instead of throwing — this keeps
 * accidental calls (e.g. from a background job) from crashing.
 */
class NullProvider implements EnrichmentProvider {
  readonly name = "none";
  isConfigured(): boolean {
    return false;
  }
  async enrichByEmail(_email: string): Promise<EnrichmentResult | null> {
    return null;
  }
  async enrichByDomain(_domain: string): Promise<EnrichmentResult | null> {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Vendor stubs                                                       */
/* ------------------------------------------------------------------ */

/**
 * Base class for vendor stubs. Each stub reports itself as unconfigured
 * (until real credentials + implementation land) and throws a sanitized code
 * if enrich* is called anyway — the exception message is deliberately opaque
 * so it's safe if it bubbles to a logger, but the route handler must still
 * catch and translate before responding to the browser.
 */
abstract class VendorStub implements EnrichmentProvider {
  abstract readonly name: string;
  protected abstract readonly errorCode: string;

  isConfigured(): boolean {
    return false;
  }
  async enrichByEmail(_email: string): Promise<EnrichmentResult | null> {
    throw new Error(this.errorCode);
  }
  async enrichByDomain(_domain: string): Promise<EnrichmentResult | null> {
    throw new Error(this.errorCode);
  }
}

class ApolloProvider extends VendorStub {
  readonly name = "apollo";
  protected readonly errorCode = "APOLLO_NOT_IMPLEMENTED";
}

class ZoomInfoProvider extends VendorStub {
  readonly name = "zoominfo";
  protected readonly errorCode = "ZOOMINFO_NOT_IMPLEMENTED";
}

/* ------------------------------------------------------------------ */
/*  AnthropicProvider                                                  */
/* ------------------------------------------------------------------ */

/**
 * LLM-backed enrichment using the same ANTHROPIC_API_KEY already provisioned
 * for the Arya chat sidebar. Split into two layers so we don't over-trust
 * hallucinations:
 *
 *   1. Deterministic parsers extract firstName/lastName from `first.last@`
 *      email patterns and derive companyName/companyWebsite from the domain.
 *      Zero LLM cost, zero hallucination risk.
 *   2. A single Claude Haiku call guesses `industry` from the domain +
 *      derived company name. The route merge already drops empty strings, so
 *      an empty guess is a safe no-op.
 *
 * Skipped on purpose: linkedinUrl, twitterUrl, phone, jobTitle, seniority,
 * companySize, location, country — LLMs can't source these from a bare
 * email/domain without inventing values, and the enrichment layer must NOT
 * write fabricated contact info into the CRM.
 */
class AnthropicProvider implements EnrichmentProvider {
  readonly name = "anthropic";
  private readonly model = "claude-haiku-4-5-20251001";

  isConfigured(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY ?? "").trim();
  }

  async enrichByEmail(email: string): Promise<EnrichmentResult | null> {
    const result: EnrichmentResult = {};
    const [localRaw, domainRaw] = email.split("@");
    const local = (localRaw ?? "").trim();
    const domain = (domainRaw ?? "").trim().toLowerCase();

    // Name from `first.last@` / `first_last@` / `first-last@` patterns only.
    // Ignore `firstlastname@` (ambiguous), initials, and role addresses.
    if (local && /^[a-z]+[._-][a-z]+$/i.test(local)) {
      const [first, last] = local.split(/[._-]/);
      if (first && last && !isRoleAddress(first) && !isRoleAddress(last)) {
        result.firstName = capitalize(first);
        result.lastName = capitalize(last);
      }
    }

    if (domain && !isFreeMailDomain(domain)) {
      result.companyWebsite = `https://${domain}`;
      const guess = deriveCompanyName(domain);
      if (guess) result.companyName = guess;

      const industry = await this.guessIndustry(domain, guess);
      if (industry) result.industry = industry;
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  async enrichByDomain(domain: string): Promise<EnrichmentResult | null> {
    const result: EnrichmentResult = {};
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!clean || isFreeMailDomain(clean)) return null;

    result.companyWebsite = `https://${clean}`;
    const guess = deriveCompanyName(clean);
    if (guess) result.companyName = guess;

    const industry = await this.guessIndustry(clean, guess);
    if (industry) result.industry = industry;

    return Object.keys(result).length > 0 ? result : null;
  }

  private async guessIndustry(
    domain: string,
    companyName: string | undefined
  ): Promise<string | undefined> {
    const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
    if (!apiKey) return undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          max_tokens: 60,
          messages: [
            {
              role: "user",
              content: [
                "You are helping enrich a B2B CRM lead record. Given ONLY a company domain and name,",
                "return the most likely industry as a 1-3 word phrase (e.g. \"SaaS\", \"FinTech\",",
                "\"Healthcare\", \"Manufacturing\", \"Consulting\", \"Retail\", \"Real Estate\").",
                "If you cannot make a confident guess, return the single word: unknown.",
                "",
                `Domain: ${domain}`,
                `Company name: ${companyName ?? "(derive from domain)"}`,
                "",
                "Respond with ONLY the industry phrase or the word unknown. No punctuation, no explanation.",
              ].join("\n"),
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("ANTHROPIC_ENRICH_HTTP_" + res.status);
      const json = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text = (json.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim()
        .replace(/\.$/, "");
      if (!text || text.toLowerCase() === "unknown" || text.length > 40) {
        return undefined;
      }
      return text;
    } catch (err) {
      // Route handler translates thrown errors to a sanitized 502. But
      // industry is an OPTIONAL enrichment — a Claude failure should not
      // wipe the deterministic firstName/lastName/companyName we already
      // computed. Swallow and return undefined so the caller keeps those.
      console.error("[enrich:anthropic] industry guess failed", {
        domain,
        err: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }
}

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "protonmail.com", "zoho.com", "mail.com", "live.com",
  "msn.com", "yandex.com", "gmx.com", "rediffmail.com", "ymail.com",
]);
const ROLE_ADDRESSES = new Set([
  "info", "hello", "contact", "sales", "support", "admin", "help",
  "team", "office", "no", "noreply", "no-reply", "donotreply",
]);

function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain.toLowerCase());
}

function isRoleAddress(part: string): boolean {
  return ROLE_ADDRESSES.has(part.toLowerCase());
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Turn `rasmussen-group.com` → `Rasmussen Group`, `acme.co.uk` → `Acme`,
 * `smith.info` → `Smith`. We strip common TLDs, replace hyphens/underscores
 * with spaces, and title-case each word.
 */
function deriveCompanyName(domain: string): string | undefined {
  const stripped = domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|co|ai|dev|app|tech|us|uk|in|de|fr|jp|cn|au|ca|info|biz|xyz|us|co\.uk|co\.in|com\.au)$/, "");
  if (!stripped) return undefined;
  const parts = stripped.split(/[.\-_]/).filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map(capitalize).join(" ");
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Resolve the enrichment provider from ENRICHMENT_PROVIDER. If the env var
 * is unset OR set to "auto", we fall through to Anthropic when
 * ANTHROPIC_API_KEY is available (the Arya chat feature already requires
 * it, so this is the zero-config default on live). Unknown values fall
 * through to NullProvider — we prefer "no enrichment" over a crash if an
 * env var is misconfigured on deploy.
 */
export function getEnrichmentProvider(): EnrichmentProvider {
  const which = (process.env.ENRICHMENT_PROVIDER ?? "").trim().toLowerCase();
  switch (which) {
    case "apollo":
      return new ApolloProvider();
    case "zoominfo":
      return new ZoomInfoProvider();
    case "anthropic":
    case "claude":
    case "llm":
      return new AnthropicProvider();
    case "none":
    case "null":
    case "off":
      return new NullProvider();
    case "":
    case "auto":
    default: {
      // Zero-config: prefer Anthropic if the shared LLM key is present,
      // otherwise NullProvider so the UI still shows an honest banner.
      const anthropic = new AnthropicProvider();
      if (anthropic.isConfigured()) return anthropic;
      return new NullProvider();
    }
  }
}
