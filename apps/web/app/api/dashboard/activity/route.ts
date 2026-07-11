export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { replies, meetings, leads } from "@aisdr/db/schema";

// Combined recent-activity feed backing the "Arya's latest activity" card
// on the Manage Arya overview. Derives from 3 existing tables — no new
// activity-log schema. Grabs the last ~5 of each and merges into one
// desc-sorted list capped at 10 items.

interface ActivityItem {
  id: string;
  type: "reply" | "meeting" | "lead";
  title: string;
  subtitle?: string;
  timestamp: string;
  leadId?: string | null;
  leadName?: string | null;
  href?: string;
}

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [recentReplies, recentMeetings, recentLeads] = await Promise.all([
      db
        .select({
          id: replies.id,
          leadId: replies.leadId,
          subject: replies.subject,
          body: replies.body,
          sentiment: replies.sentiment,
          intent: replies.intent,
          receivedAt: replies.receivedAt,
          createdAt: replies.createdAt,
          leadFullName: leads.fullName,
          leadFirstName: leads.firstName,
          leadLastName: leads.lastName,
          leadCompany: leads.companyName,
        })
        .from(replies)
        .leftJoin(leads, eq(replies.leadId, leads.id))
        .where(eq(replies.userId, user.id))
        .orderBy(desc(replies.createdAt))
        .limit(5),
      db
        .select({
          id: meetings.id,
          leadId: meetings.leadId,
          title: meetings.title,
          scheduledAt: meetings.scheduledAt,
          status: meetings.status,
          createdAt: meetings.createdAt,
          leadFullName: leads.fullName,
          leadFirstName: leads.firstName,
          leadLastName: leads.lastName,
          leadCompany: leads.companyName,
        })
        .from(meetings)
        .leftJoin(leads, eq(meetings.leadId, leads.id))
        .where(eq(meetings.userId, user.id))
        .orderBy(desc(meetings.createdAt))
        .limit(5),
      db
        .select({
          id: leads.id,
          fullName: leads.fullName,
          firstName: leads.firstName,
          lastName: leads.lastName,
          companyName: leads.companyName,
          jobTitle: leads.jobTitle,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .where(eq(leads.userId, user.id))
        .orderBy(desc(leads.createdAt))
        .limit(5),
    ]);

    const leadDisplay = (
      full: string | null | undefined,
      first: string | null | undefined,
      last: string | null | undefined
    ) => {
      if (full && full.trim()) return full.trim();
      const parts = [first, last].filter(Boolean).join(" ").trim();
      return parts || null;
    };

    const items: ActivityItem[] = [];

    for (const r of recentReplies) {
      const name = leadDisplay(r.leadFullName, r.leadFirstName, r.leadLastName);
      const sentiment = r.sentiment
        ? r.sentiment.replaceAll("_", " ")
        : r.intent;
      const nameLabel = name ?? "A lead";
      const companySuffix = r.leadCompany ? ` at ${r.leadCompany}` : "";
      const title = `${nameLabel}${companySuffix} replied`;
      const subtitleParts = [] as string[];
      if (sentiment) subtitleParts.push(`Sentiment: ${sentiment}`);
      if (r.subject) subtitleParts.push(r.subject);
      const timestamp = (r.receivedAt ?? r.createdAt)?.toISOString();
      if (!timestamp) continue;
      items.push({
        id: `reply-${r.id}`,
        type: "reply",
        title,
        subtitle: subtitleParts.join(" · ") || undefined,
        timestamp,
        leadId: r.leadId,
        leadName: name,
        href: "/inbox",
      });
    }

    for (const m of recentMeetings) {
      const name = leadDisplay(m.leadFullName, m.leadFirstName, m.leadLastName);
      const nameLabel = name ?? "A lead";
      const companySuffix = m.leadCompany ? ` at ${m.leadCompany}` : "";
      const scheduledStr = m.scheduledAt
        ? new Date(m.scheduledAt).toLocaleString()
        : null;
      items.push({
        id: `meeting-${m.id}`,
        type: "meeting",
        title: `Meeting booked with ${nameLabel}${companySuffix}`,
        subtitle: scheduledStr ? `Scheduled for ${scheduledStr}` : undefined,
        timestamp: m.createdAt.toISOString(),
        leadId: m.leadId,
        leadName: name,
      });
    }

    for (const l of recentLeads) {
      const name = leadDisplay(l.fullName, l.firstName, l.lastName);
      const nameLabel = name ?? "New lead";
      const subtitleParts: string[] = [];
      if (l.jobTitle) subtitleParts.push(l.jobTitle);
      if (l.companyName) subtitleParts.push(l.companyName);
      items.push({
        id: `lead-${l.id}`,
        type: "lead",
        title: `${nameLabel} added`,
        subtitle: subtitleParts.join(" · ") || undefined,
        timestamp: l.createdAt.toISOString(),
        leadId: l.id,
        leadName: name,
        href: `/leads`,
      });
    }

    items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ data: items.slice(0, 10) });
  } catch (err) {
    console.error("[dashboard/activity:GET] error:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
