export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureTeamSchema } from "../../_lib";

const patchSchema = z.object({
  status: z.literal("revoked"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTeamSchema();

    const body = (await req.json()) as unknown;
    const parsed = patchSchema.parse(body);

    const [updated] = await db
      .update(teamMembers)
      .set({ status: parsed.status })
      .where(and(eq(teamMembers.id, params.id), eq(teamMembers.ownerUserId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[team/members/[id]:PATCH] error:", error);
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
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTeamSchema();

    const result = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, params.id), eq(teamMembers.ownerUserId, user.id)))
      .returning({ id: teamMembers.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[team/members/[id]:DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
