import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { messageVariants, sequences } from "@aisdr/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureMessageVariantsSchema } from "../_lib";

const updateVariantSchema = z.object({
  variantKey: z.string().min(1).max(20).optional(),
  stepNumber: z.number().int().min(1).optional(),
  subject: z.string().max(1000).nullable().optional(),
  body: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Confirms the sequence exists and belongs to the requesting user, then
// confirms the variant belongs to that same sequence. Anything else 404s
// (never a 403 — we don't want to reveal that the row exists under someone
// else's account).
async function loadOwnedVariant(
  userId: string,
  sequenceId: string,
  variantId: string
) {
  const seq = await db
    .select({ id: sequences.id })
    .from(sequences)
    .where(and(eq(sequences.id, sequenceId), eq(sequences.userId, userId)))
    .limit(1);
  if (!seq[0]) return null;

  const variant = await db
    .select()
    .from(messageVariants)
    .where(
      and(
        eq(messageVariants.id, variantId),
        eq(messageVariants.sequenceId, sequenceId)
      )
    )
    .limit(1);
  return variant[0] ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const user = await requireUser();
    await ensureMessageVariantsSchema();

    const existing = await loadOwnedVariant(user.id, params.id, params.variantId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as unknown;
    const parsed = updateVariantSchema.parse(body);

    const result = await db
      .update(messageVariants)
      .set(parsed)
      .where(eq(messageVariants.id, params.variantId))
      .returning();

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
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const user = await requireUser();
    await ensureMessageVariantsSchema();

    const existing = await loadOwnedVariant(user.id, params.id, params.variantId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .delete(messageVariants)
      .where(eq(messageVariants.id, params.variantId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
