import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, listLeads, leads } from "@aisdr/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ensureListsSchema } from "../../_ensure-schema";

const addLeadsSchema = z
  .object({
    leadId: z.string().uuid().optional(),
    leadIds: z.array(z.string().uuid()).optional(),
  })
  .refine((v) => Boolean(v.leadId) || (v.leadIds?.length ?? 0) > 0, {
    message: "leadId or leadIds is required",
  });

const removeLeadSchema = z.object({
  leadId: z.string().uuid(),
});

async function getOwnedList(listId: string, userId: string) {
  const [list] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)))
    .limit(1);
  return list ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[lists:leads:POST] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureListsSchema();

    const list = await getOwnedList(params.id, user.id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const body = (await req.json()) as unknown;
    const parsed = addLeadsSchema.parse(body);
    const requestedIds = parsed.leadIds?.length
      ? parsed.leadIds
      : parsed.leadId
      ? [parsed.leadId]
      : [];
    const uniqueIds = Array.from(new Set(requestedIds));

    // Only leads owned by this user can be added to the list — never trust
    // ids blindly, otherwise a user could add someone else's lead.
    const ownedLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(inArray(leads.id, uniqueIds), eq(leads.userId, user.id)));
    const ownedIds = ownedLeads.map((l) => l.id);

    if (ownedIds.length === 0) {
      return NextResponse.json(
        { error: "No valid leads to add" },
        { status: 400 }
      );
    }

    await db
      .insert(listLeads)
      .values(ownedIds.map((leadId) => ({ listId: list.id, leadId })))
      .onConflictDoNothing({
        target: [listLeads.listId, listLeads.leadId],
      });

    const skipped = uniqueIds.length - ownedIds.length;
    return NextResponse.json(
      { data: { added: ownedIds.length, skipped } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[lists:leads:POST] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[lists:leads:DELETE] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureListsSchema();

    const list = await getOwnedList(params.id, user.id);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const body = (await req.json()) as unknown;
    const parsed = removeLeadSchema.parse(body);

    const result = await db
      .delete(listLeads)
      .where(
        and(eq(listLeads.listId, list.id), eq(listLeads.leadId, parsed.leadId))
      )
      .returning({ id: listLeads.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Lead not in list" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[lists:leads:DELETE] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
