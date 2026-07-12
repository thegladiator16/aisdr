export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { signalSubscriptions, campaigns } from "@aisdr/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureSignalSubscriptionsTable } from "@/lib/db/ensure-schema";

const createSchema = z.object({
  signalType: z.string().min(1),
  campaignId: z.string().uuid(),
});

export async function GET() {
  try {
    const user = await requireUser();
    await ensureSignalSubscriptionsTable();

    const rows = await db
      .select({
        id: signalSubscriptions.id,
        signalType: signalSubscriptions.signalType,
        enabled: signalSubscriptions.enabled,
        campaignId: signalSubscriptions.campaignId,
        campaignName: campaigns.name,
        createdAt: signalSubscriptions.createdAt,
      })
      .from(signalSubscriptions)
      .leftJoin(campaigns, eq(signalSubscriptions.campaignId, campaigns.id))
      .where(eq(signalSubscriptions.userId, user.id))
      .orderBy(desc(signalSubscriptions.createdAt));

    return NextResponse.json({ data: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await ensureSignalSubscriptionsTable();

    const body = (await req.json()) as unknown;
    const parsed = createSchema.parse(body);

    const [campaign] = await db
      .select({ id: campaigns.id, name: campaigns.name })
      .from(campaigns)
      .where(and(eq(campaigns.id, parsed.campaignId), eq(campaigns.userId, user.id)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [existing] = await db
      .select({ id: signalSubscriptions.id })
      .from(signalSubscriptions)
      .where(
        and(
          eq(signalSubscriptions.userId, user.id),
          eq(signalSubscriptions.signalType, parsed.signalType),
          eq(signalSubscriptions.campaignId, parsed.campaignId)
        )
      )
      .limit(1);

    if (existing) {
      const [reactivated] = await db
        .update(signalSubscriptions)
        .set({ enabled: true })
        .where(eq(signalSubscriptions.id, existing.id))
        .returning();
      return NextResponse.json({
        subscription: { ...reactivated, campaignName: campaign.name },
      });
    }

    const [created] = await db
      .insert(signalSubscriptions)
      .values({
        userId: user.id,
        campaignId: parsed.campaignId,
        signalType: parsed.signalType,
      })
      .returning();

    return NextResponse.json(
      { subscription: { ...created, campaignName: campaign.name } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[signals:POST] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
