export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import {
  getEnrichmentProvider,
  type EnrichmentResult,
} from "@/lib/enrichment/provider";

/**
 * POST /api/leads/[id]/enrich
 *
 * Trigger enrichment for a single lead the caller owns.
 *
 * Flow:
 *   - Ownership-scoped lookup (404 if not found or not owned).
 *   - Resolve the configured provider. If none, return 503 with a friendly
 *     JSON body — the client renders the amber "provider not configured"
 *     banner and doesn't retry.
 *   - Prefer email lookup; fall back to company domain if the lead has a
 *     website but no email. If neither is present, return 400.
 *   - Merge only defined, non-empty fields into the lead row so a partial
 *     provider response never blanks out data we already have.
 *
 * Errors from vendor stubs (e.g. "APOLLO_NOT_IMPLEMENTED") are caught and
 * translated to a generic 502 — the raw code never reaches the browser, per
 * the Razorpay sanitization pattern.
 */

type LeadRow = typeof leads.$inferSelect;

// Fields the provider can populate. Keyed by both EnrichmentResult and the
// leads row so TS enforces the mapping stays in sync when we add columns.
const ENRICHABLE_FIELDS: ReadonlyArray<keyof EnrichmentResult & keyof LeadRow> =
  [
    "firstName",
    "lastName",
    "jobTitle",
    "seniority",
    "companyName",
    "companyWebsite",
    "companySize",
    "industry",
    "location",
    "country",
    "linkedinUrl",
    "twitterUrl",
  ];

/** Extract a bare domain from `companyWebsite` (which may be a full URL). */
function extractDomain(website: string | null): string | null {
  if (!website) return null;
  const trimmed = website.trim();
  if (!trimmed) return null;
  try {
    // Handle values with or without protocol without throwing on "acme.com".
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withScheme).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = getEnrichmentProvider();

  // Honest "not configured" state — same shape as billing/status uses.
  if (!provider.isConfigured()) {
    return NextResponse.json(
      {
        error: "Enrichment provider not configured",
        providerName: "none",
        providerConfigured: false,
      },
      { status: 503 }
    );
  }

  // Ownership-scoped fetch. 404 covers both "not yours" and "doesn't exist"
  // so we don't leak the existence of leads belonging to other users.
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)))
    .limit(1);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Choose lookup path. Email is more precise; domain is a company-level
  // fallback for leads captured without an email yet.
  let result: EnrichmentResult | null = null;
  try {
    if (lead.email) {
      result = await provider.enrichByEmail(lead.email);
    } else {
      const domain = extractDomain(lead.companyWebsite);
      if (!domain) {
        return NextResponse.json(
          { error: "Lead has no email or company website to enrich from" },
          { status: 400 }
        );
      }
      result = await provider.enrichByDomain(domain);
    }
  } catch (err) {
    // Sanitize provider errors — the raw message may include internal codes
    // like "APOLLO_NOT_IMPLEMENTED" that we never want to hand to the
    // browser. Log server-side so we can still debug.
    console.error("[enrich] provider threw", {
      leadId: lead.id,
      providerName: provider.name,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: "Enrichment failed",
        providerName: provider.name,
        providerConfigured: true,
      },
      { status: 502 }
    );
  }

  if (!result) {
    return NextResponse.json({
      updated: false,
      updatedFields: [],
      providerName: provider.name,
      providerConfigured: true,
    });
  }

  // Merge only non-empty, non-undefined fields. Skip values equal to what's
  // already stored so `updatedFields` reflects actual changes, not no-ops.
  const patch: Partial<LeadRow> = {};
  const updatedFields: string[] = [];
  for (const key of ENRICHABLE_FIELDS) {
    const incoming = result[key];
    if (incoming === undefined || incoming === null) continue;
    if (typeof incoming === "string" && incoming.trim() === "") continue;
    if (lead[key] === incoming) continue;
    // Safe cast: ENRICHABLE_FIELDS is constrained to keys present on both
    // EnrichmentResult and LeadRow, and both are string-valued there.
    (patch as Record<string, unknown>)[key] = incoming;
    updatedFields.push(key);
  }

  if (updatedFields.length === 0) {
    return NextResponse.json({
      updated: false,
      updatedFields: [],
      providerName: provider.name,
      providerConfigured: true,
    });
  }

  await db
    .update(leads)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(leads.id, lead.id), eq(leads.userId, user.id)));

  return NextResponse.json({
    updated: true,
    updatedFields,
    providerName: provider.name,
    providerConfigured: true,
  });
}
