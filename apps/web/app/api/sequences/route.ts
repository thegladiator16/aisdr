import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sequences, campaigns } from "@aisdr/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureCampaignsColumns } from "@/lib/db/ensure-schema";

const stepSchema = z.object({
  stepNumber: z.number(),
  channel: z.enum([
    "email",
    "linkedin_connection",
    "linkedin_dm",
    "whatsapp",
  ]),
  delayDays: z.number(),
  subject: z.string().optional(),
  body: z.string().optional(),
  condition: z.enum(["always", "if_no_reply", "if_opened"]),
});

const createSequenceSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1),
  steps: z.array(stepSchema).min(1),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    const conditions = [eq(sequences.userId, user.id)];
    if (campaignId) conditions.push(eq(sequences.campaignId, campaignId));

    const data = await db
      .select()
      .from(sequences)
      .where(and(...conditions))
      .orderBy(desc(sequences.createdAt));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as unknown;
    const parsed = createSequenceSchema.parse(body);

    await ensureCampaignsColumns();

    const campaign = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, parsed.campaignId),
          eq(campaigns.userId, user.id)
        )
      )
      .limit(1);

    if (!campaign[0]) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const result = await db
      .insert(sequences)
      .values({
        userId: user.id,
        campaignId: parsed.campaignId,
        name: parsed.name,
        steps: parsed.steps,
        totalSteps: parsed.steps.length,
        isActive: parsed.isActive ?? true,
      })
      .returning();

    return NextResponse.json({ data: result[0] }, { status: 201 });
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
