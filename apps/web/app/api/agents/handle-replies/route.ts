export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { replies, leads, integrations, outreachMessages } from "@/lib/db/schema";
import {
  classifyAndDraftReply,
  isAgentsConfigured,
} from "@/lib/agents";
import { syncUserGmailInbox } from "@/lib/agents/inbox-sync";
import { ensureAgentTables } from "@/lib/agents/schema";

interface IntegrationConfig {
  autoReplyEnabled?: boolean;
}

/**
 * Reply-handler agent — Vercel cron target (see vercel.json).
 *
 * Two-phase sweep:
 *   1. POLL: for every user with a connected Gmail integration, fetch
 *      new inbox messages from the last cursor and insert them as
 *      `replies` rows (sentiment=null).
 *   2. CLASSIFY + AUTO-DRAFT: for each pending reply (sentiment IS
 *      NULL), classify via Claude, generate a context-aware draft,
 *      write it to reply_drafts, and — if the user opted in via
 *      integrations.config.autoReplyEnabled — auto-send via Gmail.
 *
 * Auth: Vercel cron pings include `Authorization: Bearer $CRON_SECRET`.
 * We match that against the CRON_SECRET env var so external callers
 * can't spam the endpoint. If CRON_SECRET isn't set, we accept any
 * request (dev-friendly default).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAgentsConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY missing", handled: 0 },
      { status: 503 }
    );
  }

  await ensureAgentTables();

  /* ---------- Phase 1: poll Gmail for every connected user ---------- */

  const connectedUsers = await db
    .select({
      userId: integrations.userId,
      config: integrations.config,
    })
    .from(integrations)
    .where(eq(integrations.type, "gmail"));

  // Parallelize per-user Gmail sync — each user's IMAP scan is independent.
  // Previously this ran fully serially, so total cron time scaled linearly
  // with the number of connected accounts.
  const syncResults = await Promise.all(
    connectedUsers.map(async (u) => {
      const r = await syncUserGmailInbox(u.userId);
      return { userId: u.userId, ...r };
    })
  );
  const totalScanned = syncResults.reduce((s, r) => s + r.scanned, 0);
  const totalCreated = syncResults.reduce((s, r) => s + r.created, 0);

  // Map userId → autoReplyEnabled boolean derived from integrations.config
  const autoReplyByUser = new Map<string, boolean>();
  for (const u of connectedUsers) {
    const cfg = (u.config ?? {}) as IntegrationConfig;
    autoReplyByUser.set(u.userId, Boolean(cfg.autoReplyEnabled));
  }

  /* ---------- Phase 2: classify + draft pending replies ---------- */

  // ASC so oldest-unprocessed replies are handled first. If a classification
  // fails transiently (LLM 5xx / DB hiccup) the row keeps sentiment=null
  // and re-enters the next cron window. DESC would bury old failures behind
  // new arrivals and starve them indefinitely.
  const pending = await db
    .select({
      id: replies.id,
      userId: replies.userId,
      leadId: replies.leadId,
      messageId: replies.messageId,
      body: replies.body,
      subject: replies.subject,
      externalMessageId: replies.externalMessageId,
      rfcMessageId: replies.rfcMessageId,
      threadId: replies.threadId,
    })
    .from(replies)
    .where(isNull(replies.sentiment))
    .orderBy(asc(replies.receivedAt))
    .limit(50);

  let classified = 0;
  let escalated = 0;
  let drafted = 0;
  let autoSent = 0;
  const errors: string[] = [];

  for (const r of pending) {
    try {
      // Load lead + (optional) original outreach for context.
      const [lead] = await db
        .select({
          id: leads.id,
          email: leads.email,
          fullName: leads.fullName,
          firstName: leads.firstName,
          lastName: leads.lastName,
          companyName: leads.companyName,
        })
        .from(leads)
        .where(eq(leads.id, r.leadId))
        .limit(1);

      const name =
        lead?.fullName ||
        [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
        "there";
      const company = lead?.companyName ?? "";
      const replyFromEmail = lead?.email ?? "";

      let originalSubject = "";
      let originalBody = "";
      if (r.messageId) {
        const [orig] = await db
          .select({
            subject: outreachMessages.subject,
            body: outreachMessages.body,
          })
          .from(outreachMessages)
          .where(eq(outreachMessages.id, r.messageId))
          .limit(1);
        originalSubject = orig?.subject ?? "";
        originalBody = orig?.body ?? "";
      }

      const autoSend = autoReplyByUser.get(r.userId) ?? false;

      const outcome = await classifyAndDraftReply({
        userId: r.userId,
        replyId: r.id,
        replyBody: r.body ?? "",
        replySubject: r.subject,
        replyFromEmail,
        replyThreadId: r.threadId,
        replyExternalMessageId: r.externalMessageId,
        rfcMessageId: r.rfcMessageId,
        leadName: name,
        leadCompany: company,
        originalSubject,
        originalBody,
        autoSend,
      });

      // Persist classification back onto the replies row.
      await db
        .update(replies)
        .set({
          sentiment: outcome.classification.sentiment,
          intent: outcome.classification.intent,
          aiSuggestedReply: outcome.classification.draftReply ?? null,
        })
        .where(eq(replies.id, r.id));

      classified++;
      if (outcome.classification.shouldEscalate) escalated++;
      if (outcome.draftId) drafted++;
      if (outcome.autoSent) autoSent++;

      // If not auto-sent (either disabled or unsafe) but the draft
      // exists, log a hint so an operator can spot manual work.
      if (outcome.draftId && !outcome.autoSent && outcome.error) {
        errors.push(`reply ${r.id.slice(0, 8)}: ${outcome.error}`);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({
    poll: {
      usersChecked: connectedUsers.length,
      scanned: totalScanned,
      created: totalCreated,
    },
    handled: classified,
    escalated,
    drafted,
    autoSent,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}
