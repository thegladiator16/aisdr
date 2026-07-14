export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [row] = await db
      .select({
        webhookUrl: integrations.webhookUrl,
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

    if (!row?.webhookUrl) {
      return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
    }

    const cfg = (row.config ?? {}) as Record<string, unknown>;
    const channel = cfg.channel_name ? ` in #${cfg.channel_name}` : "";

    const res = await fetch(row.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*AryaSDR* test notification${channel} — your Slack integration is working! :white_check_mark:`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[slack/test] webhook error:", text);
      return NextResponse.json(
        { error: "Slack webhook returned an error. Check your webhook URL." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[slack/test] error:", error);
    return NextResponse.json({ error: "Failed to send test message" }, { status: 500 });
  }
}
