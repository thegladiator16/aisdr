import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureCampaignsColumns } from "@/lib/db/ensure-schema";

const createCampaignSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  targetIndustries: z.array(z.string()).default([]),
  targetJobTitles: z.array(z.string()).default([]),
  targetCompanySize: z.array(z.string()).default([]),
  targetLocations: z.array(z.string()).default([]),
  targetFundingStages: z.array(z.string()).default([]),
  targetKeywords: z.array(z.string()).default([]),
  channels: z.array(z.string()).default(["email"]),
  tone: z.string().default("professional_warm"),
  language: z.string().default("english"),
  goal: z.string().default("book_meeting"),
  sendDays: z
    .array(z.string())
    .default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
  sendTimeStart: z.string().default("09:00"),
  sendTimeEnd: z.string().default("18:00"),
  dailyLimit: z.number().int().min(5).max(200).default(30),
});

export async function GET() {
  try {
    const user = await requireUser();
    await ensureCampaignsColumns();
    const result = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, user.id))
      .orderBy(desc(campaigns.createdAt));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await ensureCampaignsColumns();
    const body = await req.json() as unknown;
    const parsed = createCampaignSchema.parse(body);

    const result = await db
      .insert(campaigns)
      .values({ ...parsed, userId: user.id })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
