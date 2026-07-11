export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { ensureCampaignsColumns } from "@/lib/db/ensure-schema";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[campaigns:GET] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureCampaignsColumns();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    // Archived campaigns are excluded unless explicitly requested via
    // ?status=archived or ?status=all — mirrors every mailbox-style UI
    // (e.g. Gmail's "All Mail" excludes Trash) and is what the Campaigns
    // page's own Archive action implies: an archived campaign should stay
    // out of the main list, not silently reappear. ?status=all lets the
    // frontend fetch everything once and apply its own multi-select status
    // filter client-side.
    const conditions =
      status === "all"
        ? [eq(campaigns.userId, user.id)]
        : status
        ? [eq(campaigns.userId, user.id), eq(campaigns.status, status)]
        : [eq(campaigns.userId, user.id), ne(campaigns.status, "archived")];

    const data = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        type: campaigns.type,
        status: campaigns.status,
        totalLeads: campaigns.totalLeads,
        emailsSent: campaigns.emailsSent,
        totalReplies: campaigns.totalReplies,
        meetingsBooked: campaigns.meetingsBooked,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(and(...conditions))
      .orderBy(desc(campaigns.createdAt));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[campaigns:GET] DB error:", err);
    return NextResponse.json({ data: [], warning: "Could not fetch campaigns" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[campaigns:POST] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as unknown;
    const parsed = createCampaignSchema.parse(body);

    await ensureCampaignsColumns();

    const result = await db
      .insert(campaigns)
      .values({
        userId: user.id,
        name: parsed.name,
        description: parsed.description,
        type: parsed.type,
        status: parsed.status ?? "draft",
      })
      .returning();

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[campaigns:POST] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
