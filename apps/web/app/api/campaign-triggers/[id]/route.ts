export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaignTriggers } from "@aisdr/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureCampaignTriggersSchema } from "../_lib";

const patchSchema = z
  .object({
    enabled: z.boolean().optional(),
    threshold: z.number().int().min(0).max(100000).optional(),
  })
  .refine((v) => v.enabled !== undefined || v.threshold !== undefined, {
    message: "At least one field is required",
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
    await ensureCampaignTriggersSchema();

    const body = (await req.json()) as unknown;
    const parsed = patchSchema.parse(body);

    const [updated] = await db
      .update(campaignTriggers)
      .set(parsed)
      .where(
        and(
          eq(campaignTriggers.id, params.id),
          eq(campaignTriggers.userId, user.id)
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
    console.error("[campaign-triggers:PATCH] error:", err);
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
    await ensureCampaignTriggersSchema();

    const [deleted] = await db
      .delete(campaignTriggers)
      .where(
        and(
          eq(campaignTriggers.id, params.id),
          eq(campaignTriggers.userId, user.id)
        )
      )
      .returning({ id: campaignTriggers.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: deleted.id } });
  } catch (err) {
    console.error("[campaign-triggers:DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
