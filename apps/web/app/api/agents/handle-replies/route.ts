export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { replies, leads } from "@/lib/db/schema";
import { classifyReply, proposeMeeting, isAgentsConfigured } from "@/lib/agents";

/**
 * Reply-handler agent — Vercel cron target (see vercel.json). Called
 * hourly, sweeps recently-received replies that haven't been triaged yet,
 * classifies them, and (when the classification is `interested`) also
 * generates a meeting proposal via the Meeting Booker agent.
 *
 * Auth: Vercel cron pings include `Authorization: Bearer $CRON_SECRET`.
 * We match that against the CRON_SECRET env var so external callers can't
 * spam the endpoint. If CRON_SECRET isn't set, we accept any request
 * (dev-friendly default).
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

  // Grab up to 25 recent replies that haven't been classified yet
  // (sentiment column is used as the "handled" marker — null == pending).
  const pending = await db
    .select({
      id: replies.id,
      leadId: replies.leadId,
      body: replies.body,
    })
    .from(replies)
    .where(isNull(replies.sentiment))
    .orderBy(desc(replies.receivedAt))
    .limit(25);

  let classified = 0;
  let escalated = 0;
  let meetingsProposed = 0;
  const errors: string[] = [];

  for (const r of pending) {
    try {
      const classification = await classifyReply(r.body ?? "");
      await db
        .update(replies)
        .set({
          sentiment: classification.sentiment,
          intent: classification.intent,
        })
        .where(eq(replies.id, r.id));
      // TODO: persist classification.draftReply once a drafts column /
      //       reply-drafts table lands; for now we log it so an operator
      //       can plumb the queue by hand.
      if (classification.draftReply) {
        console.log(
          `[handle-replies] draft for reply ${r.id}:`,
          classification.draftReply
        );
      }
      classified += 1;
      if (classification.shouldEscalate) escalated += 1;

      if (classification.intent === "interested" && r.leadId) {
        const [lead] = await db
          .select({
            id: leads.id,
            fullName: leads.fullName,
            firstName: leads.firstName,
            lastName: leads.lastName,
          })
          .from(leads)
          .where(eq(leads.id, r.leadId))
          .limit(1);
        const name =
          lead?.fullName ||
          [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
          "there";
        const meeting = await proposeMeeting({
          leadName: name,
          replyBody: r.body ?? "",
        });
        // TODO: post `meeting` into outreach_messages (or wherever the
        // meeting-invite outbound lives) once Cal.com / Google Calendar
        // integration is wired. For now the proposal is logged so an
        // operator can pick it up manually.
        console.log(`[handle-replies] meeting proposed for reply ${r.id}:`, meeting);
        meetingsProposed += 1;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({
    handled: classified,
    escalated,
    meetingsProposed,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}
