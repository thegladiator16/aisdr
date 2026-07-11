export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamRoles } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureTeamSchema } from "../../_lib";

const patchSchema = z.object({
  permissions: z.record(z.boolean()),
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

    const existing = await db
      .select()
      .from(teamRoles)
      .where(and(eq(teamRoles.id, params.id), eq(teamRoles.ownerUserId, user.id)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Partial merge (read-modify-write) so a single-checkbox PATCH doesn't
    // clobber other permissions already set on this role.
    const mergedPermissions: Record<string, boolean> = {
      ...(existing[0].permissions as Record<string, boolean>),
      ...parsed.permissions,
    };

    const [updated] = await db
      .update(teamRoles)
      .set({ permissions: mergedPermissions })
      .where(and(eq(teamRoles.id, params.id), eq(teamRoles.ownerUserId, user.id)))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[team/roles/[id]:PATCH] error:", error);
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

    const existing = await db
      .select()
      .from(teamRoles)
      .where(and(eq(teamRoles.id, params.id), eq(teamRoles.ownerUserId, user.id)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing[0].isSystem) {
      return NextResponse.json(
        { error: "System roles (Admin/Member) cannot be deleted" },
        { status: 400 }
      );
    }

    await db
      .delete(teamRoles)
      .where(and(eq(teamRoles.id, params.id), eq(teamRoles.ownerUserId, user.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[team/roles/[id]:DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
