import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { replies, leads, outreachMessages, campaigns } from "@aisdr/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureRepliesColumns } from "@/lib/db/ensure-schema";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    await ensureRepliesColumns();
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "needs-action";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);

    if (tab === "sent") {
      const sent = await db
        .select({
          message: outreachMessages,
          lead: {
            id: leads.id,
            fullName: leads.fullName,
            companyName: leads.companyName,
            email: leads.email,
            jobTitle: leads.jobTitle,
          },
          campaignName: campaigns.name,
        })
        .from(outreachMessages)
        .leftJoin(leads, eq(outreachMessages.leadId, leads.id))
        .leftJoin(campaigns, eq(outreachMessages.campaignId, campaigns.id))
        .where(
          and(eq(outreachMessages.userId, user.id), eq(outreachMessages.status, "sent"))
        )
        .orderBy(desc(outreachMessages.sentAt))
        .limit(limit);

      return NextResponse.json(
        sent.map((row) => ({
          id: row.message.id,
          name: row.lead?.fullName ?? "Unknown",
          company: row.lead?.companyName ?? "",
          subject: row.message.subject ?? "(no subject)",
          preview: row.message.body.slice(0, 140),
          time: row.message.sentAt?.toISOString() ?? row.message.createdAt.toISOString(),
          date: row.message.sentAt?.toISOString() ?? row.message.createdAt.toISOString(),
          status: "sent",
          intent: null,
          campaign: row.campaignName ?? "",
          tab: "sent",
        }))
      );
    }

    const conditions = [eq(replies.userId, user.id)];
    const result = await db
      .select({
        reply: replies,
        lead: {
          id: leads.id,
          fullName: leads.fullName,
          companyName: leads.companyName,
          email: leads.email,
          jobTitle: leads.jobTitle,
        },
        campaignName: campaigns.name,
      })
      .from(replies)
      .leftJoin(leads, eq(replies.leadId, leads.id))
      .leftJoin(campaigns, eq(leads.campaignId, campaigns.id))
      .where(and(...conditions))
      .orderBy(desc(replies.receivedAt))
      .limit(limit);

    const items = result
      .filter((row) => {
        const needsAction = !!row.reply.requiresAction && !row.reply.isActedOn;
        return tab === "needs-action" ? needsAction : !needsAction;
      })
      .map((row) => ({
        id: row.reply.id,
        name: row.lead?.fullName ?? "Unknown",
        company: row.lead?.companyName ?? "",
        subject: row.reply.subject ?? "(no subject)",
        preview: row.reply.body.slice(0, 140),
        time: (row.reply.receivedAt ?? row.reply.createdAt).toISOString(),
        date: (row.reply.receivedAt ?? row.reply.createdAt).toISOString(),
        status: row.reply.intent ?? "unknown",
        intent: row.reply.intent,
        aiSuggestedReply: row.reply.aiSuggestedReply,
        isRead: row.reply.isRead,
        campaign: row.campaignName ?? "",
        tab: tab === "needs-action" ? "needs-action" : "no-action",
      }));

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
