export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { agentConfigItems } from "@aisdr/db/schema";
import { ensureAgentConfigSchema } from "../_lib";

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(1000).optional(),
    content: z.string().trim().max(10_000).nullable().optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Provide title or content",
  });

const idParam = z.string().uuid();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureAgentConfigSchema();

    const id = idParam.parse(params.id);
    const body = (await req.json().catch(() => ({}))) as unknown;
    const parsed = patchSchema.parse(body);

    const patch: { title?: string; content?: string | null } = {};
    if (parsed.title !== undefined) patch.title = parsed.title;
    if (parsed.content !== undefined) {
      patch.content = parsed.content === null || parsed.content === "" ? null : parsed.content;
    }

    const [updated] = await db
      .update(agentConfigItems)
      .set(patch)
      .where(
        and(eq(agentConfigItems.id, id), eq(agentConfigItems.userId, user.id))
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[agent-config:PATCH] error:", error);
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
    await ensureAgentConfigSchema();
    const id = idParam.parse(params.id);

    const [deleted] = await db
      .delete(agentConfigItems)
      .where(
        and(eq(agentConfigItems.id, id), eq(agentConfigItems.userId, user.id))
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: deleted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[agent-config:DELETE] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
