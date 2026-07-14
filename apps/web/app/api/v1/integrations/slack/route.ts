export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";

const connectSchema = z.object({
  webhookUrl: z.string().url().startsWith("https://hooks.slack.com/"),
  channelName: z.string().max(100).optional(),
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

    const existing = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "slack")
        )
      )
      .limit(1);

    const values = {
      webhookUrl: parsed.webhookUrl,
      status: "active" as const,
      error: null,
      config: {
        connection_type: "webhook",
        channel_name: parsed.channelName ?? "",
      },
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
        type: "slack",
        ...values,
      });
    }

    return NextResponse.json({
      success: true,
      channel: parsed.channelName ?? "",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid webhook URL. Must start with https://hooks.slack.com/" },
        { status: 400 }
      );
    }
    console.error("[slack] POST error:", error);
    return NextResponse.json({ error: "Failed to connect Slack" }, { status: 500 });
  }
}

export async function DELETE() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db
      .update(integrations)
      .set({
        webhookUrl: null,
        status: "disconnected",
        config: {},
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "slack")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[slack] DELETE error:", error);
    return NextResponse.json({ error: "Failed to disconnect Slack" }, { status: 500 });
  }
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [row] = await db
      .select({
        id: integrations.id,
        webhookUrl: integrations.webhookUrl,
        status: integrations.status,
        config: integrations.config,
      })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "slack")
        )
      )
      .limit(1);

    const cfg = (row?.config ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      connected: !!(row?.webhookUrl),
      status: row?.status ?? "disconnected",
      channel: cfg.channel_name ?? "",
    });
  } catch (error) {
    console.error("[slack] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
