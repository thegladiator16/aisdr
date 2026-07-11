import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { consumeCredits } from "@/lib/credits";

const createLeadSchema = z.object({
  campaignId: z.string().uuid().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");

    const conditions = [eq(leads.userId, user.id)];
    if (campaignId) conditions.push(eq(leads.campaignId, campaignId));
    if (status) conditions.push(eq(leads.status, status));

    const data = await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const result = await db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
      .returning({ id: leads.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as unknown;
    const parsed = createLeadSchema.parse(body);

    const fullName =
      parsed.fullName ??
      ([parsed.firstName, parsed.lastName].filter(Boolean).join(" ") ||
        undefined);

    const result = await db
      .insert(leads)
      .values({
        userId: user.id,
        campaignId: parsed.campaignId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        fullName,
        email: parsed.email || undefined,
        companyName: parsed.companyName,
        jobTitle: parsed.jobTitle,
        status: parsed.status ?? "new",
      })
      .returning();

    await consumeCredits({
      userId: user.id,
      amount: 1,
      action: "lead_added",
      campaignId: parsed.campaignId,
    });

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
