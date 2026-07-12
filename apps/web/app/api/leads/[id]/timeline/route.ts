export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, outreachMessages, replies, tasks } from "@aisdr/db/schema";
import { and, eq, desc } from "drizzle-orm";

/* ---------------------------------------------------------------------- */
/*  Types                                                                 */
/* ---------------------------------------------------------------------- */

type TimelineEvent =
  | {
      type: "lead_created";
      when: string;
    }
  | {
      type: "outreach_sent";
      when: string;
      id: string;
      channel: string;
      subject: string | null;
      body: string;
      opens: number;
      replies: number;
      status: string | null;
    }
  | {
      type: "reply_received";
      when: string;
      id: string;
      channel: string;
      subject: string | null;
      body: string;
      sentiment: string | null;
      intent: string | null;
    }
  | {
      type: "task";
      when: string;
      id: string;
      taskType: string | null;
      message: string | null;
      status: string | null;
    };

/* ---------------------------------------------------------------------- */
/*  GET — profile + merged timeline                                        */
/* ---------------------------------------------------------------------- */

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership check + fetch basic profile in one query.
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Pull all three related event tables in parallel — each scoped to
    // this user AND this lead so cross-tenant IDs can never leak in.
    const [outreachRows, replyRows, taskRows] = await Promise.all([
      db
        .select({
          id: outreachMessages.id,
          channel: outreachMessages.channel,
          subject: outreachMessages.subject,
          body: outreachMessages.body,
          status: outreachMessages.status,
          openCount: outreachMessages.openCount,
          sentAt: outreachMessages.sentAt,
          createdAt: outreachMessages.createdAt,
          repliedAt: outreachMessages.repliedAt,
        })
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.leadId, params.id),
            eq(outreachMessages.userId, user.id)
          )
        )
        .orderBy(desc(outreachMessages.createdAt))
        .limit(100),
      db
        .select({
          id: replies.id,
          messageId: replies.messageId,
          channel: replies.channel,
          subject: replies.subject,
          body: replies.body,
          sentiment: replies.sentiment,
          intent: replies.intent,
          receivedAt: replies.receivedAt,
          createdAt: replies.createdAt,
        })
        .from(replies)
        .where(
          and(eq(replies.leadId, params.id), eq(replies.userId, user.id))
        )
        .orderBy(desc(replies.createdAt))
        .limit(100),
      db
        .select({
          id: tasks.id,
          taskType: tasks.taskType,
          message: tasks.message,
          status: tasks.status,
          createdAt: tasks.createdAt,
        })
        .from(tasks)
        .where(and(eq(tasks.leadId, params.id), eq(tasks.userId, user.id)))
        .orderBy(desc(tasks.createdAt))
        .limit(100),
    ]);

    // Count replies per outreach message so we can show "N replies" on the
    // outbound-sent event. Cheap because we already have the reply rows.
    const repliesByMessageId = new Map<string, number>();
    for (const r of replyRows) {
      if (r.messageId) {
        repliesByMessageId.set(
          r.messageId,
          (repliesByMessageId.get(r.messageId) ?? 0) + 1
        );
      }
    }

    const events: TimelineEvent[] = [];

    // lead created — always present
    events.push({
      type: "lead_created",
      when: (lead.createdAt ?? new Date()).toISOString(),
    });

    for (const m of outreachRows) {
      const when = (m.sentAt ?? m.createdAt ?? new Date()).toISOString();
      events.push({
        type: "outreach_sent",
        when,
        id: m.id,
        channel: m.channel,
        subject: m.subject,
        body: m.body,
        opens: m.openCount ?? 0,
        replies: repliesByMessageId.get(m.id) ?? 0,
        status: m.status,
      });
    }

    for (const r of replyRows) {
      const when = (r.receivedAt ?? r.createdAt ?? new Date()).toISOString();
      events.push({
        type: "reply_received",
        when,
        id: r.id,
        channel: r.channel,
        subject: r.subject,
        body: r.body,
        sentiment: r.sentiment,
        intent: r.intent,
      });
    }

    for (const t of taskRows) {
      const when = (t.createdAt ?? new Date()).toISOString();
      events.push({
        type: "task",
        when,
        id: t.id,
        taskType: t.taskType,
        message: t.message,
        status: t.status,
      });
    }

    events.sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0));
    const timeline = events.slice(0, 50);

    return NextResponse.json({
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        linkedinUrl: lead.linkedinUrl,
        twitterUrl: lead.twitterUrl,
        jobTitle: lead.jobTitle,
        seniority: lead.seniority,
        department: lead.department,
        companyName: lead.companyName,
        companyWebsite: lead.companyWebsite,
        companyLinkedinUrl: lead.companyLinkedinUrl,
        companySize: lead.companySize,
        industry: lead.industry,
        location: lead.location,
        country: lead.country,
        status: lead.status,
        score: lead.score,
        researchSummary: lead.researchSummary,
        painPoints: lead.painPoints ?? [],
        icebreakers: lead.icebreakers ?? [],
        tags: lead.tags ?? [],
        notes: lead.notes,
        createdAt: (lead.createdAt ?? new Date()).toISOString(),
        updatedAt: (lead.updatedAt ?? new Date()).toISOString(),
      },
      timeline,
    });
  } catch (err) {
    console.error("[leads:timeline:GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------------------- */
/*  PATCH — update mutable fields (currently: notes, status)              */
/*                                                                        */
/*  There is no top-level /api/leads/[id] route yet, and the strict scope */
/*  for this feature is (timeline route + detail page). Rather than add a */
/*  parallel route that would go stale, the detail page's "Save notes"    */
/*  action PATCHes here.                                                  */
/* ---------------------------------------------------------------------- */

const patchSchema = z.object({
  notes: z.string().max(10000).optional(),
  status: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as unknown;
    const parsed = patchSchema.parse(body);

    const update: Partial<typeof leads.$inferInsert> & {
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (parsed.notes !== undefined) update.notes = parsed.notes;
    if (parsed.status !== undefined) update.status = parsed.status;

    const result = await db
      .update(leads)
      .set(update)
      .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)))
      .returning({ id: leads.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: result[0].id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[leads:timeline:PATCH] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
