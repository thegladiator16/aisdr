import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, leads, outreachMessages, meetings } from "@aisdr/db/schema";
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
    ]);

    const totalSent = ratesResult[0]?.total ?? 0;
    const totalOpened = ratesResult[0]?.opened ?? 0;
    const totalReplied = ratesResult[0]?.replied ?? 0;

    return NextResponse.json({
      data: {
        totalCampaigns: totalCampaignsResult[0]?.count ?? 0,
        totalLeads: totalLeadsResult[0]?.count ?? 0,
        emailsSent: emailsSentResult[0]?.count ?? 0,
        avgOpenRate:
          totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        avgReplyRate:
          totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
        meetingsBooked: meetingsBookedResult[0]?.count ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
