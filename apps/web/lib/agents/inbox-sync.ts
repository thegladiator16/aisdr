/**
 * Shared Gmail-poll-and-insert helper. Used by:
 *   - /api/v1/inbox/sync  → user-triggered manual pull from the Inbox UI
 *   - /api/agents/handle-replies  → cron that sweeps every connected
 *     user before the classification pass
 *
 * Behaviour:
 *   1. Load the user's gmail integration + lastSyncAt cursor.
 *   2. Call GmailClient.getNewReplies(cursor) to pull recent inbox
 *      messages.
 *   3. For each message: match sender → known lead, dedupe on
 *      externalMessageId, insert a `replies` row with sentiment=null so
 *      the classification pass picks it up.
 *   4. Bump integrations.lastSyncAt.
 *
 * Errors are logged, not thrown — a broken token for user A must not
 * sink the whole cron run.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrations, leads, replies, outreachMessages } from "@/lib/db/schema";
import { GmailClient } from "@/lib/integrations/gmail";
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

export interface InboxSyncResult {
  scanned: number;
  created: number;
  matched: number;
  errors: string[];
}

export async function syncUserGmailInbox(userId: string): Promise<InboxSyncResult> {
  const result: InboxSyncResult = { scanned: 0, created: 0, matched: 0, errors: [] };

  try {
    await ensureRepliesColumns();

    const [gmailIntegration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.type, "gmail")))
      .limit(1);

    if (!gmailIntegration?.accessToken) {
      result.errors.push("gmail_not_connected");
      return result;
    }

    const since =
      gmailIntegration.lastSyncAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const gmail = new GmailClient(
      gmailIntegration.accessToken,
      gmailIntegration.refreshToken ?? ""
    );
    const messages = (await gmail.getNewReplies(since)) as GmailMessage[];
    result.scanned = messages.length;

    for (const msg of messages) {
      const externalMessageId = msg.id;
      const fromEmail = extractEmail(getHeader(msg.payload?.headers, "From"));
      const subject = getHeader(msg.payload?.headers, "Subject");
      const body = extractBody(msg.payload).slice(0, 20000) || msg.snippet || "";

      if (!fromEmail) continue;

      const [lead] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.userId, userId), eq(leads.email, fromEmail)))
        .limit(1);
      if (!lead) continue; // not from a known lead — skip
      result.matched++;

      const [existing] = await db
        .select({ id: replies.id })
        .from(replies)
        .where(
          and(
            eq(replies.userId, userId),
            eq(replies.externalMessageId, externalMessageId)
          )
        )
        .limit(1);
      if (existing) continue;

      // Extract the RFC 2822 Message-ID header so auto-replies can set
      // In-Reply-To / References correctly. The Gmail API msg.id is only
      // used for dedup; RFC threading requires the actual header value.
      const rfcMessageId = getHeader(msg.payload?.headers, "Message-ID") || null;

      // Try to link back to the original outreach row so the classifier
      // can see what we sent. Match on Gmail threadId (most reliable) or
      // externalMessageId (In-Reply-To / References header).
      const inReplyToHeader = getHeader(msg.payload?.headers, "In-Reply-To").trim();
      let messageId: string | null = null;
      if (msg.threadId) {
        const [orig] = await db
          .select({ id: outreachMessages.id })
          .from(outreachMessages)
          .where(
            and(
              eq(outreachMessages.userId, userId),
              eq(outreachMessages.threadId, msg.threadId)
            )
          )
          .limit(1);
        messageId = orig?.id ?? null;
      }
      if (!messageId && inReplyToHeader) {
        const [orig] = await db
          .select({ id: outreachMessages.id })
          .from(outreachMessages)
          .where(
            and(
              eq(outreachMessages.userId, userId),
              eq(outreachMessages.externalMessageId, inReplyToHeader)
            )
          )
          .limit(1);
        messageId = orig?.id ?? null;
      }

      // Insert with sentiment=null so the classification pass — either
      // the on-demand analyzeReply in the sync route, or the cron's
      // classifyAndDraftReply — picks it up.
      await db.insert(replies).values({
        userId,
        leadId: lead.id,
        messageId: messageId ?? undefined,
        channel: "email",
        subject: subject || null,
        body,
        externalMessageId,
        threadId: msg.threadId ?? null,
        rfcMessageId,
        receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)) : new Date(),
      });
      result.created++;
    }

    await db
      .update(integrations)
      .set({ lastSyncAt: new Date() })
      .where(eq(integrations.id, gmailIntegration.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    console.error("[inbox-sync] failed for user", userId, msg);
  }

  return result;
}
