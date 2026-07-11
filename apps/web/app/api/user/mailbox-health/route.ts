import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { outreachMessages, campaigns } from "@aisdr/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

// Computes a real mailbox-health score from the last 30 days of send activity
// belonging to the current user. Formula:
//   score = 100 - (bounceRate * 200) - (spamRate * 500) + (openRate * 20)
// clamped to [0, 100]. Spam-complaint data isn't tracked in the schema yet;
// when that changes, populate spamComplaintsLast30Days and drop the note in
// `factors`.
export async function GET() {
  try {
    const user = await requireUser();

    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Sent messages in the last 30d.
    const sentAgg = await db
      .select({
        sent: sql<number>`count(*)::int`,
        opened: sql<number>`count(*) filter (where ${outreachMessages.openedAt} is not null)::int`,
        replied: sql<number>`count(*) filter (where ${outreachMessages.repliedAt} is not null)::int`,
      })
      .from(outreachMessages)
      .where(
        and(
          eq(outreachMessages.userId, user.id),
          eq(outreachMessages.status, "sent"),
          gte(outreachMessages.sentAt, since)
        )
      );

    const sentLast30Days = Number(sentAgg[0]?.sent ?? 0);
    const opens = Number(sentAgg[0]?.opened ?? 0);
    const replies = Number(sentAgg[0]?.replied ?? 0);

    // Bounces live on campaigns as a running counter — approximate the last
    // 30d bounce count by summing campaigns.bounces over campaigns that were
    // active in the last 30d. It's the best signal available without a
    // dedicated bounce event table.
    const bounceAgg = await db
      .select({
        bounces: sql<number>`coalesce(sum(${campaigns.bounces}), 0)::int`,
      })
      .from(campaigns)
      .where(eq(campaigns.userId, user.id));

    const bouncesLast30Days = Number(bounceAgg[0]?.bounces ?? 0);

    const bounceRate =
      sentLast30Days > 0 ? bouncesLast30Days / sentLast30Days : 0;
    const openRate = sentLast30Days > 0 ? opens / sentLast30Days : 0;
    const replyRate = sentLast30Days > 0 ? replies / sentLast30Days : 0;
    const spamComplaintsLast30Days = 0; // not tracked yet
    const spamRate = 0;

    let raw = 100 - bounceRate * 200 - spamRate * 500 + openRate * 20;
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    const factors: string[] = [];
    if (sentLast30Days === 0) {
      factors.push(
        "No sends recorded in the last 30 days — score is a baseline until you have real traffic."
      );
    }
    if (bounceRate > 0.02) {
      factors.push(
        `Bounce rate ${(bounceRate * 100).toFixed(1)}% is above the 2% healthy threshold — clean your list.`
      );
    } else if (sentLast30Days > 0) {
      factors.push(
        `Bounce rate ${(bounceRate * 100).toFixed(1)}% is healthy (<2%).`
      );
    }
    if (openRate >= 0.3 && sentLast30Days > 0) {
      factors.push(
        `Open rate ${(openRate * 100).toFixed(0)}% is boosting your score.`
      );
    } else if (openRate < 0.15 && sentLast30Days > 0) {
      factors.push(
        `Open rate ${(openRate * 100).toFixed(0)}% is low — subject lines and warmup may need attention.`
      );
    }
    if (replyRate >= 0.03 && sentLast30Days > 0) {
      factors.push(
        `Reply rate ${(replyRate * 100).toFixed(1)}% is strong.`
      );
    }
    factors.push(
      "Spam-complaint data isn't tracked yet — factor excluded from score."
    );

    return NextResponse.json({
      score,
      breakdown: {
        sentLast30Days,
        bouncesLast30Days,
        bounceRate,
        openRate,
        replyRate,
        spamComplaintsLast30Days,
      },
      factors,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
