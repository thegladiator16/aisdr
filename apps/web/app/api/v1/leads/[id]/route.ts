import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { enqueueLeadResearch } from "@/lib/queue";

const updateLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  jobTitle: z.string().optional(),
  seniority: z.string().optional(),
  department: z.string().optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string()).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

async function getLeadOrFail(userId: string, id: string) {
  const result = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const lead = await getLeadOrFail(user.id, params.id);
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lead);
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
    const lead = await getLeadOrFail(user.id, params.id);
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as unknown;
    const parsed = updateLeadSchema.parse(body);

    const result = await db
      .update(leads)
      .set({ ...parsed, updatedAt: new Date() })
      .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)))
      .returning();

    if (!result[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await db
      .delete(leads)
      .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json() as { action: string };

    if (body.action === "research") {
      await db
        .update(leads)
        .set({ status: "researching", updatedAt: new Date() })
        .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)));

      await enqueueLeadResearch({ leadId: params.id, userId: user.id });
      return NextResponse.json({ status: "queued" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
