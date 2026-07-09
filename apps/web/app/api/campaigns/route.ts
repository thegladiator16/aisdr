export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[campaigns:GET] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        totalLeads: campaigns.totalLeads,
        emailsSent: campaigns.emailsSent,
        totalReplies: campaigns.totalReplies,
        meetingsBooked: campaigns.meetingsBooked,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(eq(campaigns.userId, user.id))
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

    const result = await db
      .insert(campaigns)
      .values({
        userId: user.id,
        name: parsed.name,
        description: parsed.description,
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
