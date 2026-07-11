export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadRoutingRules, teamMembers } from "@aisdr/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureLeadRoutingSchema, sanitizeMatchCriteria } from "../_lib";
import { ensureTeamSchema } from "../../team/_lib";

const criteriaSchema = z
  .object({
    industry: z.string().optional(),
    region: z.string().optional(),
    seniority: z.string().optional(),
    minCompanySize: z.number().int().min(0).optional(),
    maxCompanySize: z.number().int().min(0).optional(),
    jobTitleContains: z.string().optional(),
  })
  .passthrough();

const patchSchema = z
  .object({
    priority: z.number().int().min(0).max(10000).optional(),
    matchCriteria: criteriaSchema.optional(),
    assignToTeamMemberId: z.string().uuid().nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.priority !== undefined ||
      v.matchCriteria !== undefined ||
      v.assignToTeamMemberId !== undefined ||
      v.enabled !== undefined,
    { message: "At least one field is required" }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureLeadRoutingSchema();
    await ensureTeamSchema();

    const body = (await req.json()) as unknown;
    const parsed = patchSchema.parse(body);

    if (parsed.assignToTeamMemberId) {
      const [tm] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.id, parsed.assignToTeamMemberId),
            eq(teamMembers.ownerUserId, user.id)
          )
        )
        .limit(1);
      if (!tm) {
        return NextResponse.json(
          { error: "Team member not found" },
          { status: 404 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (parsed.priority !== undefined) updates.priority = parsed.priority;
    if (parsed.enabled !== undefined) updates.enabled = parsed.enabled;
    if (parsed.assignToTeamMemberId !== undefined)
      updates.assignToTeamMemberId = parsed.assignToTeamMemberId;
    if (parsed.matchCriteria !== undefined) {
      updates.matchCriteria = sanitizeMatchCriteria(
        parsed.matchCriteria as Record<string, unknown>
      );
    }

    const [updated] = await db
      .update(leadRoutingRules)
      .set(updates)
      .where(
        and(
          eq(leadRoutingRules.id, params.id),
          eq(leadRoutingRules.ownerUserId, user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[lead-routing:PATCH] error:", err);
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
    await ensureLeadRoutingSchema();

    const [deleted] = await db
      .delete(leadRoutingRules)
      .where(
        and(
          eq(leadRoutingRules.id, params.id),
          eq(leadRoutingRules.ownerUserId, user.id)
        )
      )
      .returning({ id: leadRoutingRules.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: deleted.id } });
  } catch (err) {
    console.error("[lead-routing:DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
