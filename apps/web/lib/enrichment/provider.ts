/**
 * Pluggable enrichment provider abstraction.
 *
 * Artisan/Clearbit/Apollo/ZoomInfo-style lead enrichment requires an external
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

class ClearbitProvider extends VendorStub {
  readonly name = "clearbit";
  protected readonly errorCode = "CLEARBIT_NOT_IMPLEMENTED";
}

class ZoomInfoProvider extends VendorStub {
  readonly name = "zoominfo";
  protected readonly errorCode = "ZOOMINFO_NOT_IMPLEMENTED";
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Resolve the enrichment provider from ENRICHMENT_PROVIDER. Unknown values
 * fall through to NullProvider — we prefer "no enrichment" over a crash if
 * an env var is misconfigured on deploy.
 */
export function getEnrichmentProvider(): EnrichmentProvider {
  const which = (process.env.ENRICHMENT_PROVIDER ?? "").trim().toLowerCase();
  switch (which) {
    case "apollo":
      return new ApolloProvider();
    case "clearbit":
      return new ClearbitProvider();
    case "zoominfo":
      return new ZoomInfoProvider();
    default:
      return new NullProvider();
  }
}
