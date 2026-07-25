export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { encryptPassword } from "@/lib/integrations/gmail";

const ALLOWED_TYPES = ["hubspot", "salesforce", "apollo", "linkedin_unipile"];

const connectSchema = z.object({
  type: z.string().refine((t) => ALLOWED_TYPES.includes(t), "Invalid integration type"),
  apiKey: z.string().min(1, "API key is required"),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = connectSchema.parse(body);

    const encrypted = encryptPassword(parsed.apiKey);

    const existing = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, parsed.type)
        )
      )
      .limit(1);

    const values = {
      accessToken: encrypted,
      status: "active" as const,
      error: null,
      config: { connection_type: "api_key" },
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(integrations)
        .set(values)
        .where(eq(integrations.id, existing[0].id));
    } else {
      await db.insert(integrations).values({
        userId: user.id,
        type: parsed.type,
        ...values,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[api-key] POST error:", error);
    return NextResponse.json({ error: "Failed to connect integration" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    await db
      .update(integrations)
      .set({
        accessToken: null,
        status: "disconnected",
        config: {},
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, type)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api-key] DELETE error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
