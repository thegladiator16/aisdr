export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEnrichmentProvider } from "@/lib/enrichment/provider";

/**
 * Reports which enrichment provider (if any) is wired up on this
 * deployment. Public by design and safe to hit before auth. The answer
 * only changes on redeploy — cache at the edge.
 */
export function GET() {
  const provider = getEnrichmentProvider();
  return NextResponse.json(
    {
      providerName: provider.name,
      providerConfigured: provider.isConfigured(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
