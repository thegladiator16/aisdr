export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

interface Insight {
  type: "timing" | "subject" | "personalization" | "followup" | "channel";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  metric?: string;
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await db.execute(sql`
      SELECT
        COUNT(*)::int                                                          AS total,
        COUNT(*) FILTER (WHERE status = 'opened' OR opened_at IS NOT NULL)::int AS opened,
        COUNT(*) FILTER (WHERE status = 'replied')::int                        AS replied,
        COUNT(*) FILTER (WHERE status = 'bounced')::int                        AS bounced,
        COUNT(*) FILTER (WHERE status = 'sent')::int                           AS sent_only
      FROM outreach_messages
      WHERE user_id = ${user.id}
        AND created_at >= NOW() - INTERVAL '30 days'
    `);

    const row = (stats as any).rows?.[0] ?? stats[0] ?? {};
    const total = Number(row.total ?? 0);
    const opened = Number(row.opened ?? 0);
    const replied = Number(row.replied ?? 0);
    const bounced = Number(row.bounced ?? 0);

    const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
    const replyRate = total > 0 ? Math.round((replied / total) * 100) : 0;
    const bounceRate = total > 0 ? Math.round((bounced / total) * 100) : 0;

    let overallScore = 0;
    if (total > 0) {
      overallScore = Math.min(
        100,
        Math.round(openRate * 0.3 + replyRate * 2 + Math.max(0, 100 - bounceRate * 5) * 0.2)
      );
    }

    const insights: Insight[] = [];
    const recommendations: string[] = [];

    if (total === 0) {
      recommendations.push(
        "Run your first campaign to get personalised coaching from Arya.",
        "Connect your Gmail account to start sending outreach.",
        "Set up email warmup for better deliverability."
      );
      return NextResponse.json({
        overallScore: 0,
        insights: [],
        weeklyTrend: "stable",
        topPerformingDay: null,
        topPerformingHour: null,
        avgResponseTime: null,
        recommendations,
      });
    }

    if (bounceRate > 5) {
      insights.push({
        type: "channel",
        title: "High bounce rate detected",
        description: `Your bounce rate is ${bounceRate}%. Verify email addresses before sending and enable warmup.`,
        impact: "high",
        metric: `${bounced} bounced out of ${total} sent`,
      });
    }

    if (openRate < 30) {
      insights.push({
        type: "subject",
        title: "Subject lines need improvement",
        description: "Your open rate is below 30%. Try shorter, curiosity-driven subject lines.",
        impact: "high",
        metric: `${openRate}% open rate (industry avg: 35-45%)`,
      });
    } else if (openRate >= 50) {
      insights.push({
        type: "subject",
        title: "Great subject lines!",
        description: "Your open rate is above 50%, well above industry average.",
        impact: "low",
        metric: `${openRate}% open rate`,
      });
    }

    if (openRate > 30 && replyRate < 5) {
      insights.push({
        type: "personalization",
        title: "Opens are high but replies are low",
        description: "People open your emails but don't reply. Add more personalisation and a clearer CTA.",
        impact: "high",
        metric: `${openRate}% open → ${replyRate}% reply`,
      });
    }

    if (replyRate >= 10) {
      insights.push({
        type: "followup",
        title: "Strong reply rate",
        description: "Your personalisation strategy is working. Consider multi-step sequences to boost it further.",
        impact: "medium",
        metric: `${replyRate}% reply rate`,
      });
    }

    const bestDayResult = await db.execute(sql`
      SELECT TO_CHAR(sent_at, 'Day') AS day, EXTRACT(DOW FROM sent_at)::int AS dow,
        COUNT(*) FILTER (WHERE status = 'replied')::float / GREATEST(COUNT(*), 1) AS rate
      FROM outreach_messages
      WHERE user_id = ${user.id} AND sent_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day, dow HAVING COUNT(*) >= 2
      ORDER BY rate DESC LIMIT 1
    `);
    const bestDay = ((bestDayResult as any).rows?.[0] ?? bestDayResult[0] ?? {}).day?.trim() ?? null;

    const bestHourResult = await db.execute(sql`
      SELECT EXTRACT(HOUR FROM sent_at)::int AS hour,
        COUNT(*) FILTER (WHERE status = 'replied')::float / GREATEST(COUNT(*), 1) AS rate
      FROM outreach_messages
      WHERE user_id = ${user.id} AND sent_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY hour HAVING COUNT(*) >= 2
      ORDER BY rate DESC LIMIT 1
    `);
    const bestHour = ((bestHourResult as any).rows?.[0] ?? bestHourResult[0] ?? {}).hour ?? null;

    if (bestDay) {
      insights.push({
        type: "timing",
        title: `${bestDay} is your best day`,
        description: `Emails sent on ${bestDay} get the highest reply rate. Schedule more campaigns then.`,
        impact: "medium",
      });
    }

    const weeklyResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND (status = 'replied'))::float
          / GREATEST(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 1) AS this_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' AND (status = 'replied'))::float
          / GREATEST(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'), 1) AS last_week
      FROM outreach_messages
      WHERE user_id = ${user.id}
    `);
    const wRow = (weeklyResult as any).rows?.[0] ?? weeklyResult[0] ?? {};
    const thisWeek = Number(wRow.this_week ?? 0);
    const lastWeek = Number(wRow.last_week ?? 0);
    const weeklyTrend: "improving" | "declining" | "stable" =
      thisWeek > lastWeek + 0.02 ? "improving" : thisWeek < lastWeek - 0.02 ? "declining" : "stable";

    if (openRate < 30) recommendations.push("Try shorter subject lines (3-5 words) with a question or number.");
    if (replyRate < 5) recommendations.push("Add a specific, low-friction CTA like 'worth a 15-min chat?'.");
    if (bounceRate > 3) recommendations.push("Enable email warmup to improve sender reputation and reduce bounces.");
    if (replyRate >= 5 && replyRate < 15) recommendations.push("Add a 2nd follow-up email 3 days after the first — sequences boost replies 2-3×.");
    if (total < 100) recommendations.push("Increase your outreach volume — more data helps Arya optimise faster.");
    if (recommendations.length === 0) recommendations.push("Your outreach is performing well. Keep it up!");

    return NextResponse.json({
      overallScore,
      insights,
      weeklyTrend,
      topPerformingDay: bestDay,
      topPerformingHour: bestHour !== null ? Number(bestHour) : null,
      avgResponseTime: null,
      recommendations,
    });
  } catch (err) {
    console.error("[api/coaching] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
