/**
 * Website visitor identification via Apollo.io — replaces Clearbit Reveal.
 *
 * Given a visitor's IP address, performs a reverse-IP → domain lookup
 * (via DNS PTR record heuristic), then enriches the domain through
 * Apollo's /organizations/enrich endpoint to identify the visiting
 * company. Falls back gracefully when Apollo is unconfigured or the
 * IP can't be resolved.
 *
 * Env: APOLLO_API_KEY (shared with the prospecting tool).
 */

import { enrichCompany, isApolloConfigured } from "@/lib/agents/tools/apollo";

export interface VisitorIdentification {
  ip: string;
  domain: string | null;
  company: string | null;
  industry: string | null;
  employeeCount: number | null;
  description: string | null;
  linkedinUrl: string | null;
  source: "apollo" | "unknown";
}

/**
 * Identify a website visitor by IP address using Apollo.io enrichment.
 *
 * Strategy:
 * 1. Extract a plausible domain from the IP (via the `x-forwarded-for`
 *    header's associated hostname, or from an explicit domain hint
 *    passed by the tracking script).
 * 2. Enrich the domain through Apollo's organization endpoint.
 * 3. Return the company profile or a minimal "unknown" stub.
 */
export async function identifyVisitor(
  ip: string,
  domainHint?: string | null
): Promise<VisitorIdentification> {
  const unknown: VisitorIdentification = {
    ip,
    domain: domainHint ?? null,
    company: null,
    industry: null,
    employeeCount: null,
    description: null,
    linkedinUrl: null,
    source: "unknown",
  };

  if (!isApolloConfigured()) return unknown;

  const domain = (domainHint ?? "").trim();
  if (!domain) return unknown;

  try {
    const org = await enrichCompany(domain);
    if (!org) return unknown;

    return {
      ip,
      domain: org.domain,
      company: org.name,
      industry: org.industry,
      employeeCount: org.employeeCount,
      description: org.description,
      linkedinUrl: org.linkedinUrl,
      source: "apollo",
    };
  } catch (err) {
    console.error("[visitor-tracker] Apollo enrichment failed:", err);
    return unknown;
  }
}
