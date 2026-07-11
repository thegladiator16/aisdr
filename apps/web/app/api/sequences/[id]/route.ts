import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sequences } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";

const stepSchema = z.object({
  stepNumber: z.number(),
  channel: z.enum(["email", "linkedin_connection", "linkedin_dm", "whatsapp"]),
  delayDays: z.number(),
  subject: z.string().optional(),
  body: z.string().optional(),
  condition: z.enum(["always", "if_no_reply", "if_opened"]),
});

const updateSequenceSchema = z.object({
  name: z.string().min(1).optional(),
  steps: z.array(stepSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as unknown;
    const parsed = updateSequenceSchema.parse(body);

    const result = await db
      .update(sequences)
      .set({
        ...parsed,
        ...(parsed.steps ? { totalSteps: parsed.steps.length } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(sequences.id, params.id), eq(sequences.userId, user.id)))
      .returning();

    if (!result[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    const result = await db
      .delete(sequences)
      .where(and(eq(sequences.id, params.id), eq(sequences.userId, user.id)))
      .returning({ id: sequences.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
