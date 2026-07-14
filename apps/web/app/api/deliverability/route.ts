import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Aggregate outreach stats for the last 30 days
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) AS total_sent,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) AS total_opened,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) AS total_replied,
        COUNT(CASE WHEN status = 'bounced' OR error IS NOT NULL THEN 1 END) AS total_bounced
      FROM outreach_messages
      WHERE user_id = ${user.id}::uuid
        AND sent_at IS NOT NULL
        AND sent_at > now() - interval '30 days'
    `);

    const row = ((stats as any).rows?.[0] ?? {}) as {
      total_sent: string;
      total_opened: string;
      total_replied: string;
      total_bounced: string;
    };

    const totalSent = Number(row.total_sent ?? 0);
    const totalOpened = Number(row.total_opened ?? 0);
    const totalReplied = Number(row.total_replied ?? 0);
    const totalBounced = Number(row.total_bounced ?? 0);

    const bounceRate = totalSent > 0 ? totalBounced / totalSent : 0;
    const openRate = totalSent > 0 ? totalOpened / totalSent : 0;
    const replyRate = totalSent > 0 ? totalReplied / totalSent : 0;

    // Health score: start at 100, penalise bounces/spam, reward opens
    let raw = 100 - bounceRate * 200 + openRate * 20;
    const healthScore = Math.max(0, Math.min(100, Math.round(raw)));

    return NextResponse.json({
      healthScore,
      totalSent,
      totalOpened,
      totalReplied,
      totalBounced,
      bounceRate,
      openRate,
      replyRate,
    });
  } catch (error) {
    console.error("[deliverability] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverability data" },
      { status: 500 }
    );
  }
}
