export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, leads, replies } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { GmailClient, decryptPassword } from "@/lib/integrations/gmail";
import { agentClient } from "@/lib/agents/client";
import { ensureRepliesColumns } from "@/lib/db/ensure-schema";

interface GmailHeader {
  name: string;
  value: string;
}
interface GmailPayload {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
}
interface GmailMessage {
  id: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailPayload;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf-8"
  );
}

function extractBody(payload?: GmailPayload): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    const plain = payload.parts.find((p) => p.mimeType === "text/plain");
    if (plain?.body?.data) return decodeBase64Url(plain.body.data);
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return "";
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

/**
 * Pulls new inbox messages from Gmail since the integration's last sync,
 * matches each sender to a known lead by email, and creates a `replies` row
 * (AI-classified via the agent-service where possible). There's no Gmail
 * push/webhook wired up (that needs a Pub/Sub subscription we don't have
 * provisioned), so this is a manual/polled sync rather than realtime —
 * called on-demand from the Inbox page instead of silently doing nothing.
 */
export async function POST() {
  try {
    const user = await requireUser();
    await ensureRepliesColumns();

    const [gmailIntegration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")))
      .limit(1);

    if (!gmailIntegration?.accessToken || !gmailIntegration?.accountEmail) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    const since =
      gmailIntegration.lastSyncAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cfg = (gmailIntegration.config ?? {}) as Record<string, unknown>;
    const gmail = new GmailClient(
      gmailIntegration.accountEmail,
      decryptPassword(gmailIntegration.accessToken),
      gmailIntegration.accountName ?? undefined,
      (cfg.smtp_host as string) || undefined,
      (cfg.smtp_port as number) || undefined,
    );
    const messages = (await gmail.getNewReplies(since)) as GmailMessage[];

    let created = 0;
    for (const msg of messages) {
      const externalMessageId = msg.id;
      const fromEmail = extractEmail(getHeader(msg.payload?.headers, "From"));
      const subject = getHeader(msg.payload?.headers, "Subject");
      const body = extractBody(msg.payload).slice(0, 20000) || msg.snippet || "";

      if (!fromEmail) continue;

      const [lead] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.userId, user.id), eq(leads.email, fromEmail)))
        .limit(1);
      if (!lead) continue; // not a reply from a known lead — skip

      const [existing] = await db
        .select({ id: replies.id })
        .from(replies)
        .where(
          and(
            eq(replies.userId, user.id),
            eq(replies.externalMessageId, externalMessageId)
          )
        )
        .limit(1);
      if (existing) continue; // already synced

      let sentiment = "neutral";
      let intent = "ask_more_info";
      let requiresAction = true;
      let actionType = "reply";
      let aiSuggestedReply = "";
      try {
        const analysis = await agentClient.analyzeReply({
          reply_id: externalMessageId,
          lead_id: lead.id,
          reply_body: body,
          original_message_body: "",
          channel: "email",
        });
        sentiment = analysis.sentiment;
        intent = analysis.intent;
        requiresAction = analysis.requires_action;
        actionType = analysis.action_type;
        aiSuggestedReply = analysis.ai_suggested_reply;
      } catch (err) {
        console.error("[inbox/sync] analyzeReply failed, using default:", err);
      }

      await db.insert(replies).values({
        userId: user.id,
        leadId: lead.id,
        channel: "email",
        subject: subject || null,
        body,
        sentiment,
        intent,
        aiSuggestedReply: aiSuggestedReply || null,
        requiresAction,
        actionType,
        externalMessageId,
        threadId: msg.threadId ?? null,
        receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)) : new Date(),
      });
      created++;
    }

    await db
      .update(integrations)
      .set({ lastSyncAt: new Date() })
      .where(eq(integrations.id, gmailIntegration.id));

    return NextResponse.json({ success: true, created, scanned: messages.length });
  } catch (err) {
    console.error("[inbox/sync] error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
