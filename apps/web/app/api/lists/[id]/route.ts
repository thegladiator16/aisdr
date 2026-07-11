import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, listLeads, leads } from "@aisdr/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureListsSchema } from "../_ensure-schema";

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[lists:id:GET] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureListsSchema();

    const [list] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, params.id), eq(lists.userId, user.id)))
      .limit(1);

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const members = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        email: leads.email,
        companyName: leads.companyName,
        jobTitle: leads.jobTitle,
        status: leads.status,
        addedAt: listLeads.addedAt,
      })
      .from(listLeads)
      .innerJoin(leads, eq(listLeads.leadId, leads.id))
      .where(eq(listLeads.listId, list.id))
      .orderBy(desc(listLeads.addedAt));

    return NextResponse.json({
      data: { ...list, leadCount: members.length, leads: members },
    });
  } catch (err) {
    console.error("[lists:id:GET] error:", err);
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
    const user = await requireUser().catch((e) => {
      console.error("[lists:id:PATCH] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureListsSchema();

    const body = (await req.json()) as unknown;
    const parsed = updateListSchema.parse(body);

    if (Object.keys(parsed).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const result = await db
      .update(lists)
      .set(parsed)
      .where(and(eq(lists.id, params.id), eq(lists.userId, user.id)))
      .returning();

    if (!result[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[lists:id:PATCH] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[lists:id:DELETE] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureListsSchema();

    const [list] = await db
      .select({ id: lists.id })
      .from(lists)
      .where(and(eq(lists.id, params.id), eq(lists.userId, user.id)))
      .limit(1);

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Explicitly clear membership rows first rather than trusting cascade —
    // list_leads is created via runtime DDL (ensureListsSchema) rather than
    // a tracked migration, so we don't lean on ON DELETE CASCADE alone.
    await db.delete(listLeads).where(eq(listLeads.listId, list.id));
    await db.delete(lists).where(eq(lists.id, list.id));

    return NextResponse.json({ data: { id: list.id } });
  } catch (err) {
    console.error("[lists:id:DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
