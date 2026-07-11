export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  agentConfigItems,
  AGENT_CONFIG_CATEGORIES,
  type AgentConfigItem,
} from "@aisdr/db/schema";
import { ensureAgentConfigSchema } from "./_lib";

const createSchema = z.object({
  category: z.enum(AGENT_CONFIG_CATEGORIES),
  title: z.string().trim().min(1, "title is required").max(1000),
  content: z.string().trim().max(10_000).optional(),
});

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureAgentConfigSchema();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    if (category) {
      if (!(AGENT_CONFIG_CATEGORIES as readonly string[]).includes(category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      const rows = await db
        .select()
        .from(agentConfigItems)
        .where(
          and(
            eq(agentConfigItems.userId, user.id),
            eq(agentConfigItems.category, category)
          )
        )
        .orderBy(asc(agentConfigItems.createdAt));
      return NextResponse.json({ data: rows });
    }

    // No category filter — return everything, grouped by category so the
    // Manage page can hydrate all sections in one round-trip.
    const rows = await db
      .select()
      .from(agentConfigItems)
      .where(eq(agentConfigItems.userId, user.id))
      .orderBy(asc(agentConfigItems.createdAt));

    const grouped: Record<string, AgentConfigItem[]> = {};
    for (const slug of AGENT_CONFIG_CATEGORIES) grouped[slug] = [];
    for (const row of rows) {
      if (grouped[row.category]) grouped[row.category].push(row);
    }
    return NextResponse.json({ data: grouped });
  } catch (err) {
    console.error("[agent-config:GET] error:", err);
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
    await ensureAgentConfigSchema();

    const body = (await req.json().catch(() => ({}))) as unknown;
    const parsed = createSchema.parse(body);

    const [created] = await db
      .insert(agentConfigItems)
      .values({
        userId: user.id,
        category: parsed.category,
        title: parsed.title,
        content: parsed.content ? parsed.content : null,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[agent-config:POST] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
