export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, leads } from "@aisdr/db/schema";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

// POST /api/campaigns/:id/reactivate-stale-leads
//
// Sweeps every lead owned by the caller whose lastContactedAt is older
// than N days and whose status is one of the "cold" statuses, then
// re-attaches them to this campaign (campaignId set, status reset to
// "new"). Mirrors the "CRM reactivation motion" that Artisan AI ships:
// closed-lost / no-response leads get automatically re-enrolled into
// a fresh sequence.
const bodySchema = z.object({
  staleAfterDays: z.number().int().positive().max(3650).optional(),
  fromStatuses: z.array(z.string().min(1)).min(1).optional(),
});

const DEFAULT_STALE_DAYS = 60;
const DEFAULT_FROM_STATUSES = ["not_interested", "no_response"];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 404 (not 401) if the campaign isn't ours — treat other users'
    // campaign ids as non-existent, don't leak that they exist.
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let parsed: z.infer<typeof bodySchema> = {};
    // Body is optional — an empty POST should fall through to defaults.
    try {
      const json = await req.json();
      parsed = bodySchema.parse(json);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: err.errors }, { status: 400 });
      }
      // Unparseable/empty JSON → defaults, not a hard failure.
    }

    const staleAfterDays = parsed.staleAfterDays ?? DEFAULT_STALE_DAYS;
    const fromStatuses = parsed.fromStatuses ?? DEFAULT_FROM_STATUSES;

    const cutoff = new Date(Date.now() - staleAfterDays * 24 * 60 * 60 * 1000);

    // A single UPDATE ... WHERE is cheap and atomic — no need to fetch
    // first. RETURNING id lets us count what actually moved.
    const updated = await db
      .update(leads)
      .set({
        campaignId: params.id,
        status: "new",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leads.userId, user.id),
          lt(leads.lastContactedAt, cutoff),
          inArray(leads.status, fromStatuses)
        )
      )
      .returning({ id: leads.id });

    // Nudge the campaign's totalLeads counter so the card on /campaigns
    // stays roughly in sync without needing a separate recount job.
    if (updated.length > 0) {
      await db
        .update(campaigns)
        .set({
          totalLeads: sql`COALESCE(${campaigns.totalLeads}, 0) + ${updated.length}`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id))
        );
    }

    return NextResponse.json({
      enrolled: updated.length,
      criteria: { staleAfterDays, fromStatuses },
    });
  } catch (err) {
    console.error("[campaigns:reactivate-stale-leads] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
