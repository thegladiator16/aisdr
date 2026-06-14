import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, leads } from "@aisdr/db/schema";
import { eq, and, count } from "drizzle-orm";

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  status: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    const result = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .limit(1);

    const campaign = result[0];
    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const leadsCountResult = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(eq(leads.campaignId, campaign.id), eq(leads.userId, user.id))
      );

    return NextResponse.json({
      data: { ...campaign, leadsCount: leadsCountResult[0]?.count ?? 0 },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as unknown;
    const parsed = updateCampaignSchema.parse(body);

    const result = await db
      .update(campaigns)
      .set({
        ...parsed,
        fromEmail: parsed.fromEmail || undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .returning();

    if (!result[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as unknown;
    const parsed = updateCampaignSchema.parse(body);

    await db
      .update(campaigns)
      .set({
        ...parsed,
        fromEmail: parsed.fromEmail || undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    const result = await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .returning();

    if (!result[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: params.id } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
