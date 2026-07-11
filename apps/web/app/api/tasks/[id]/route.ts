export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@aisdr/db/schema";
import { ensureTasksColumns } from "../_lib";

const patchTaskSchema = z.object({
  action: z.enum(["approve", "schedule", "reject"]),
  dueDate: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureTasksColumns();

    const body = (await req.json()) as unknown;
    const parsed = patchTaskSchema.parse(body);

    // "reject" deletes the task outright — a rejected AI-drafted draft has
    // no reason to linger in the queue, and this keeps the status enum
    // limited to "pending" | "scheduled" (matching the frontend's own
    // status-filter vocabulary) rather than growing a "rejected" bucket
    // nothing filters on.
    if (parsed.action === "reject") {
      const deleted = await db
        .delete(tasks)
        .where(and(eq(tasks.id, params.id), eq(tasks.userId, user.id)))
        .returning({ id: tasks.id });

      if (deleted.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ data: { id: params.id, deleted: true } });
    }

    // "approve" and "schedule" both move the task to "scheduled"; "schedule"
    // additionally stamps a dueDate when one is provided.
    const updates: Partial<typeof tasks.$inferInsert> = {
      status: "scheduled",
    };
    if (parsed.action === "schedule" && parsed.dueDate) {
      updates.dueDate = new Date(parsed.dueDate);
    }

    const result = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, params.id), eq(tasks.userId, user.id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[tasks/:id PATCH] error:", error);
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
    const user = await requireUser();
    await ensureTasksColumns();

    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, params.id), eq(tasks.userId, user.id)))
      .returning({ id: tasks.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: params.id } });
  } catch (err) {
    console.error("[tasks/:id DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
