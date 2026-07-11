import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { messageVariants, sequences } from "@aisdr/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ensureMessageVariantsSchema } from "./_lib";

const createVariantSchema = z.object({
  stepNumber: z.number().int().min(1),
  variantKey: z.string().min(1).max(20),
  subject: z.string().max(1000).optional(),
  body: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureMessageVariantsSchema();

    // Ownership: only return variants for a sequence the caller owns.
    const seq = await db
      .select({ id: sequences.id })
      .from(sequences)
      .where(and(eq(sequences.id, params.id), eq(sequences.userId, user.id)))
      .limit(1);
    if (!seq[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await db
      .select()
      .from(messageVariants)
      .where(eq(messageVariants.sequenceId, params.id))
      .orderBy(asc(messageVariants.stepNumber), asc(messageVariants.variantKey));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureMessageVariantsSchema();

    const body = (await req.json()) as unknown;
    const parsed = createVariantSchema.parse(body);

    const seq = await db
      .select({ id: sequences.id })
      .from(sequences)
      .where(and(eq(sequences.id, params.id), eq(sequences.userId, user.id)))
      .limit(1);
    if (!seq[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await db
      .insert(messageVariants)
      .values({
        sequenceId: params.id,
        stepNumber: parsed.stepNumber,
        variantKey: parsed.variantKey,
        subject: parsed.subject ?? null,
        body: parsed.body ?? null,
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
