import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, leads, outreachMessages, meetings, replies } from "@aisdr/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireUser();

    const [
      totalCampaignsResult,
      totalLeadsResult,
      emailsSentResult,
      ratesResult,
      meetingsBookedResult,
      replySentimentResult,
      bounceResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(campaigns)
        .where(eq(campaigns.userId, user.id)),
      db
        .select({ count: count() })
        .from(leads)
        .where(eq(leads.userId, user.id)),
      db
        .select({ count: count() })
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.userId, user.id),
            eq(outreachMessages.channel, "email"),
            sql`${outreachMessages.sentAt} is not null`
          )
        ),
      db
        .select({
          total: count(),
          opened: sql<number>`sum(case when ${outreachMessages.openCount} > 0 then 1 else 0 end)`,
          replied: sql<number>`sum(case when ${outreachMessages.repliedAt} is not null then 1 else 0 end)`,
        })
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.userId, user.id),
            sql`${outreachMessages.sentAt} is not null`
          )
        ),
      db
        .select({ count: count() })
        .from(meetings)
        .where(eq(meetings.userId, user.id)),
      db
        .select({
          total: count(),
          positive: sql<number>`sum(case when ${replies.sentiment} in ('positive', 'very_positive') or ${replies.intent} = 'interested' then 1 else 0 end)`,
        })
        .from(replies)
        .where(eq(replies.userId, user.id)),
      db
        .select({
          bounces: sql<number>`coalesce(sum(${campaigns.bounces}), 0)`,
        })
        .from(campaigns)
        .where(eq(campaigns.userId, user.id)),
    ]);

    const totalSent = ratesResult[0]?.total ?? 0;
    const totalOpened = ratesResult[0]?.opened ?? 0;
    const totalReplied = ratesResult[0]?.replied ?? 0;
    const totalReplies = replySentimentResult[0]?.total ?? 0;
    const positiveReplies = replySentimentResult[0]?.positive ?? 0;
    const emailsSent = emailsSentResult[0]?.count ?? 0;
    const bounces = bounceResult[0]?.bounces ?? 0;

    return NextResponse.json({
      data: {
        totalCampaigns: totalCampaignsResult[0]?.count ?? 0,
        totalLeads: totalLeadsResult[0]?.count ?? 0,
        emailsSent,
        avgOpenRate:
          totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        avgReplyRate:
          totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
        meetingsBooked: meetingsBookedResult[0]?.count ?? 0,
        totalReplies,
        positiveReplies,
        bounces,
        bounceRate: emailsSent > 0 ? Math.round((bounces / emailsSent) * 100) : 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
