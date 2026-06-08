import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { enqueueLeadResearch } from "@/lib/queue";

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

    const body = await req.json() as Record<string, unknown>;
    const { id: _id, userId: _uid, createdAt: _ca, ...updateable } = body;

    const result = await db
      .update(leads)
      .set({ ...updateable, updatedAt: new Date() })
      .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch {
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
