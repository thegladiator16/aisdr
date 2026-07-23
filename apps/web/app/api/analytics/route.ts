export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, leads, outreachMessages, meetings, replies } from "@aisdr/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  try {
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
            sql`${outreachMessages.sentAt} is not null`,
            sql`${outreachMessages.createdAt} >= NOW() - MAKE_INTERVAL(days => ${days})`
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
            sql`${outreachMessages.sentAt} is not null`,
            sql`${outreachMessages.createdAt} >= NOW() - MAKE_INTERVAL(days => ${days})`
          )
        ),
      db
        .select({ count: count() })
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, user.id),
            sql`${meetings.createdAt} >= NOW() - MAKE_INTERVAL(days => ${days})`
          )
        ),
      db
        .select({
          total: count(),
          positive: sql<number>`sum(case when ${replies.sentiment} in ('positive', 'very_positive') or ${replies.intent} = 'interested' then 1 else 0 end)`,
        })
        .from(replies)
        .where(
          and(
            eq(replies.userId, user.id),
            sql`${replies.createdAt} >= NOW() - MAKE_INTERVAL(days => ${days})`
          )
        ),
      db
        .select({
          bounces: sql<number>`coalesce(sum(${campaigns.bounces}), 0)`,
        })
        .from(campaigns)
        .where(eq(campaigns.userId, user.id)),
    ]);

    const totalSent = ratesResult[0]?.total ?? 0;
    const totalOpened = Number(ratesResult[0]?.opened ?? 0);
    const totalReplied = Number(ratesResult[0]?.replied ?? 0);
    const totalReplies = replySentimentResult[0]?.total ?? 0;
    const positiveReplies = Number(replySentimentResult[0]?.positive ?? 0);
    const emailsSent = emailsSentResult[0]?.count ?? 0;
    const bounces = Number(bounceResult[0]?.bounces ?? 0);
    const totalBounced = bounces;
    const meetingsBooked = meetingsBookedResult[0]?.count ?? 0;

    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
    const bounceRate = emailsSent > 0 ? Math.round((bounces / emailsSent) * 100) : 0;

    // Run both aggregation queries in parallel — they touch the same table
    // but are independent, so no need to wait for one before starting the
    // other. Saves one full DB round-trip on every analytics request.
    const [subjectsResult, sendTimesResult] = await Promise.all([
      db.execute(sql`
        SELECT
          subject,
          COUNT(*)::int AS total,
          SUM(CASE WHEN open_count > 0 THEN 1 ELSE 0 END)::int AS opened,
          SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END)::int AS replied
        FROM outreach_messages
        WHERE user_id = ${user.id}
          AND subject IS NOT NULL
          AND sent_at IS NOT NULL
          AND created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        GROUP BY subject
        HAVING COUNT(*) >= 2
        ORDER BY SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END)::float / GREATEST(COUNT(*), 1) DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT
          TO_CHAR(sent_at, 'Dy') AS day,
          EXTRACT(HOUR FROM sent_at)::int AS hour,
          COUNT(*)::int AS total,
          SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END)::int AS replied
        FROM outreach_messages
        WHERE user_id = ${user.id}
          AND sent_at IS NOT NULL
          AND created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        GROUP BY day, hour
        HAVING COUNT(*) >= 2
        ORDER BY SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END)::float / GREATEST(COUNT(*), 1) DESC
        LIMIT 5
      `),
    ]);
    const subjectRows = (subjectsResult as any).rows ?? subjectsResult ?? [];
    const topSubjects = (Array.isArray(subjectRows) ? subjectRows : []).map((r: any) => ({
      subject: r.subject,
      openRate: Number(r.total) > 0 ? Math.round((Number(r.opened) / Number(r.total)) * 100) : 0,
      replyRate: Number(r.total) > 0 ? Math.round((Number(r.replied) / Number(r.total)) * 100) : 0,
    }));
    const sendTimeRows = (sendTimesResult as any).rows ?? sendTimesResult ?? [];
    const bestSendTimes = (Array.isArray(sendTimeRows) ? sendTimeRows : []).map((r: any) => ({
      day: r.day,
      hour: Number(r.hour),
      replyRate: Number(r.total) > 0 ? Math.round((Number(r.replied) / Number(r.total)) * 100) : 0,
    }));

    return NextResponse.json({
      totalSent,
      totalOpened,
      totalReplied,
      totalBounced,
      meetingsBooked,
      openRate,
      replyRate,
      bounceRate,
      topSubjects,
      dailyStats: [],
      bestSendTimes,
      data: {
        totalCampaigns: totalCampaignsResult[0]?.count ?? 0,
        totalLeads: totalLeadsResult[0]?.count ?? 0,
        emailsSent,
        avgOpenRate: openRate,
        avgReplyRate: replyRate,
        meetingsBooked,
        totalReplies,
        positiveReplies,
        bounces,
        bounceRate,
      },
    });
  } catch (err) {
    console.error("[api/analytics] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
