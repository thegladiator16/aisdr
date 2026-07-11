export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEnrichmentProvider } from "@/lib/enrichment/provider";

/**
 * Reports which enrichment provider (if any) is wired up on this
 * deployment. Public by design and safe to hit before auth — the
 * availability of a vendor integration is not a per-user secret, and it
 * mirrors the pattern already used by /api/billing/status.
 *
 * The UI uses this to preemptively render the amber "provider not
 * configured" banner in the lead sidepanel, so users learn about the state
 * without having to click Enrich and hit a 503.
 */
export function GET() {
  const provider = getEnrichmentProvider();
  return NextResponse.json({
    providerName: provider.name,
    providerConfigured: provider.isConfigured(),
  });
}
