import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, listLeads } from "@aisdr/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { ensureListsSchema } from "./_ensure-schema";

const createListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[lists:GET] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureListsSchema();

    const rows = await db
      .select()
      .from(lists)
      .where(eq(lists.userId, user.id))
      .orderBy(desc(lists.createdAt));

    if (rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Don't trust the denormalized lead_count column — compute real counts
    // from list_leads so the UI never shows a stale number.
    const listIds = rows.map((l) => l.id);
    const memberships = await db
      .select({ listId: listLeads.listId })
      .from(listLeads)
      .where(inArray(listLeads.listId, listIds));

    const counts = new Map<string, number>();
    for (const m of memberships) {
      counts.set(m.listId, (counts.get(m.listId) ?? 0) + 1);
    }

    const data = rows.map((l) => ({
      ...l,
      leadCount: counts.get(l.id) ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[lists:GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[lists:POST] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureListsSchema();

    const body = (await req.json()) as unknown;
    const parsed = createListSchema.parse(body);

    const result = await db
      .insert(lists)
      .values({
        userId: user.id,
        name: parsed.name,
        description: parsed.description,
      })
      .returning();

    return NextResponse.json(
      { data: { ...result[0], leadCount: 0 } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[lists:POST] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
