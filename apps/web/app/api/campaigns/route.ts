import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  status: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const data = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, user.id))
      .orderBy(desc(campaigns.createdAt));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as unknown;
    const parsed = createCampaignSchema.parse(body);

    const result = await db
      .insert(campaigns)
      .values({
        userId: user.id,
        name: parsed.name,
        description: parsed.description,
        subject: parsed.subject,
        body: parsed.body,
        fromEmail: parsed.fromEmail || undefined,
        status: parsed.status ?? "draft",
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
