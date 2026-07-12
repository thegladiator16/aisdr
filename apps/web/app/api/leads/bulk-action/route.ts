export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, campaigns } from "@aisdr/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(10000),
  action: z.enum(["enroll_campaign", "set_status", "add_tag", "delete"]),
  params: z
    .object({
      campaignId: z.string().uuid().optional(),
      status: z.string().min(1).max(100).optional(),
      tag: z.string().min(1).max(100).optional(),
    })
    .default({}),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as unknown;
    const parsed = bulkActionSchema.parse(body);
    const { ids, action, params } = parsed;
    const totalRequested = ids.length;

    if (action === "enroll_campaign") {
      if (!params.campaignId) {
        return NextResponse.json(
          { error: "campaignId is required" },
          { status: 400 }
        );
      }

      const owned = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, params.campaignId),
            eq(campaigns.userId, user.id)
          )
        )
        .limit(1);

      if (owned.length === 0) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        );
      }

      const updated = await db
        .update(leads)
        .set({ campaignId: params.campaignId, status: "new" })
        .where(and(inArray(leads.id, ids), eq(leads.userId, user.id)))
        .returning({ id: leads.id });

      const affected = updated.length;
      return NextResponse.json({
        affected,
        skipped: totalRequested - affected,
        action,
      });
    }

    if (action === "set_status") {
      if (!params.status) {
        return NextResponse.json(
          { error: "status is required" },
          { status: 400 }
        );
      }
      const updated = await db
        .update(leads)
        .set({ status: params.status })
        .where(and(inArray(leads.id, ids), eq(leads.userId, user.id)))
        .returning({ id: leads.id });

      const affected = updated.length;
      return NextResponse.json({
        affected,
        skipped: totalRequested - affected,
        action,
      });
    }

    if (action === "add_tag") {
      if (!params.tag) {
        return NextResponse.json(
          { error: "tag is required" },
          { status: 400 }
        );
      }
      // Append the tag if it isn't already present. jsonb `||` concatenates
      // arrays; `@>` checks containment.
      const tagJson = JSON.stringify([params.tag]);
      const updated = await db
        .update(leads)
        .set({
          tags: sql`CASE
            WHEN ${leads.tags} @> ${tagJson}::jsonb THEN ${leads.tags}
            ELSE COALESCE(${leads.tags}, '[]'::jsonb) || ${tagJson}::jsonb
          END`,
        })
        .where(and(inArray(leads.id, ids), eq(leads.userId, user.id)))
        .returning({ id: leads.id });

      const affected = updated.length;
      return NextResponse.json({
        affected,
        skipped: totalRequested - affected,
        action,
      });
    }

    if (action === "delete") {
      const deleted = await db
        .delete(leads)
        .where(and(inArray(leads.id, ids), eq(leads.userId, user.id)))
        .returning({ id: leads.id });

      const affected = deleted.length;
      return NextResponse.json({
        affected,
        skipped: totalRequested - affected,
        action,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[leads:bulk-action] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
