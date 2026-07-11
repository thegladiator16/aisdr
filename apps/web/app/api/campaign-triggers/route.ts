export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaignTriggers, campaigns } from "@aisdr/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { ensureCampaignTriggersSchema, TRIGGER_TYPES } from "./_lib";

const createSchema = z
  .object({
    campaignId: z.string().uuid(),
    triggerType: z.enum(TRIGGER_TYPES),
    threshold: z.number().int().min(0).max(100000),
  })
  .superRefine((val, ctx) => {
    // Percent-based triggers are bounded [0,100] — reject out-of-range
    // early so users don't quietly configure "credits_used_pct 500%".
    if (val.triggerType === "credits_used_pct" && val.threshold > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["threshold"],
        message: "credits_used_pct threshold must be between 0 and 100",
      });
    }
  });

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureCampaignTriggersSchema();

    const rows = await db
      .select({
        id: campaignTriggers.id,
        campaignId: campaignTriggers.campaignId,
        campaignName: campaigns.name,
        triggerType: campaignTriggers.triggerType,
        threshold: campaignTriggers.threshold,
        enabled: campaignTriggers.enabled,
        lastFiredAt: campaignTriggers.lastFiredAt,
        createdAt: campaignTriggers.createdAt,
      })
      .from(campaignTriggers)
      .leftJoin(campaigns, eq(campaignTriggers.campaignId, campaigns.id))
      .where(eq(campaignTriggers.userId, user.id))
      .orderBy(desc(campaignTriggers.createdAt));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[campaign-triggers:GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureCampaignTriggersSchema();

    const body = (await req.json()) as unknown;
    const parsed = createSchema.parse(body);

    // Verify the campaign belongs to the caller before persisting the
    // trigger — otherwise a user could point a trigger at somebody
    // else's campaign id.
    const [owned] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, parsed.campaignId),
          eq(campaigns.userId, user.id)
        )
      )
      .limit(1);

    if (!owned) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const [created] = await db
      .insert(campaignTriggers)
      .values({
        userId: user.id,
        campaignId: parsed.campaignId,
        triggerType: parsed.triggerType,
        threshold: parsed.threshold,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[campaign-triggers:POST] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
