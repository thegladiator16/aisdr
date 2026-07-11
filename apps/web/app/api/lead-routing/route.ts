export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadRoutingRules, teamMembers } from "@aisdr/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { ensureLeadRoutingSchema, sanitizeMatchCriteria } from "./_lib";
import { ensureTeamSchema } from "../team/_lib";

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

const createSchema = z.object({
  priority: z.number().int().min(0).max(10000).optional(),
  matchCriteria: criteriaSchema,
  assignToTeamMemberId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureLeadRoutingSchema();
    await ensureTeamSchema();

    const rows = await db
      .select({
        id: leadRoutingRules.id,
        priority: leadRoutingRules.priority,
        matchCriteria: leadRoutingRules.matchCriteria,
        assignToTeamMemberId: leadRoutingRules.assignToTeamMemberId,
        assignToEmail: teamMembers.email,
        enabled: leadRoutingRules.enabled,
        createdAt: leadRoutingRules.createdAt,
      })
      .from(leadRoutingRules)
      .leftJoin(
        teamMembers,
        eq(leadRoutingRules.assignToTeamMemberId, teamMembers.id)
      )
      .where(eq(leadRoutingRules.ownerUserId, user.id))
      .orderBy(asc(leadRoutingRules.priority), asc(leadRoutingRules.createdAt));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[lead-routing:GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureLeadRoutingSchema();
    await ensureTeamSchema();

    const body = (await req.json()) as unknown;
    const parsed = createSchema.parse(body);

    // If a team member is being targeted, verify they belong to this
    // owner — otherwise a rule could route leads to someone in a
    // different account.
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

    const criteria = sanitizeMatchCriteria(
      parsed.matchCriteria as Record<string, unknown>
    );

    const [created] = await db
      .insert(leadRoutingRules)
      .values({
        ownerUserId: user.id,
        priority: parsed.priority ?? 100,
        matchCriteria: criteria,
        assignToTeamMemberId: parsed.assignToTeamMemberId ?? null,
        enabled: parsed.enabled ?? true,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[lead-routing:POST] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
