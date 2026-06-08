import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { outreachMessages, leads, campaigns } from "@aisdr/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireUser();
    const stats = await getDashboardStats(user.id);

    const [activityTimeline, funnelData] = await Promise.all([
      db
        .select({
          date: sql<string>`date_trunc('day', ${outreachMessages.sentAt})::date`,
          sent: sql<number>`count(*)`,
          opened: sql<number>`sum(case when ${outreachMessages.openCount} > 0 then 1 else 0 end)`,
          replied: sql<number>`sum(case when ${outreachMessages.repliedAt} is not null then 1 else 0 end)`,
        })
        .from(outreachMessages)
        .where(eq(outreachMessages.userId, user.id))
        .groupBy(sql`date_trunc('day', ${outreachMessages.sentAt})::date`)
        .orderBy(sql`date_trunc('day', ${outreachMessages.sentAt})::date`)
        .limit(14),

      db
        .select({ count: sql<number>`count(*)`, status: leads.status })
        .from(leads)
        .where(eq(leads.userId, user.id))
        .groupBy(leads.status),
    ]);

    return NextResponse.json({
      overview: stats,
      activityTimeline,
      funnelData,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
