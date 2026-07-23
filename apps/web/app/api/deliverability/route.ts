import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRecommendation(
  bounceRate: number,
  openRate: number,
  replyRate: number,
  spamComplaints: number
): string | null {
  if (bounceRate > 5)
    return "Your bounce rate is critically high. Verify email addresses before sending and remove invalid contacts from your lists.";
  if (spamComplaints > 3)
    return "Multiple spam complaints detected. Review your email content and ensure recipients have opted in to receive your messages.";
  if (bounceRate > 2)
    return "Bounce rate is above average. Consider using email verification to clean your contact list.";
  if (openRate < 30)
    return "Open rates are below average. Try personalizing subject lines and sending at optimal times for your audience.";
  if (replyRate < 5)
    return "Reply rates could improve. Make your call-to-action clearer and ensure your message is relevant to each prospect.";
  return null;
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const perMailbox = await db.execute(sql`
      SELECT
        i.account_email AS email,
        COUNT(om.id) AS total_sent,
        COUNT(CASE WHEN om.opened_at IS NOT NULL THEN 1 END) AS total_opened,
        COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) AS total_replied,
        COUNT(CASE WHEN om.status = 'bounced' OR om.error IS NOT NULL THEN 1 END) AS total_bounced,
        COUNT(CASE WHEN om.status = 'spam' THEN 1 END) AS spam_complaints
      FROM integrations i
      LEFT JOIN outreach_messages om
        ON om.user_id = i.user_id
        AND om.sent_at IS NOT NULL
        AND om.sent_at > now() - interval '30 days'
      WHERE i.user_id = ${user.id}::uuid
        AND i.type = 'gmail'
        AND i.account_email IS NOT NULL
        AND i.access_token IS NOT NULL
      GROUP BY i.account_email
      ORDER BY i.account_email
    `);

    const rows = ((perMailbox as any).rows ?? []) as Array<{
      email: string;
      total_sent: string;
      total_opened: string;
      total_replied: string;
      total_bounced: string;
      spam_complaints: string;
    }>;

    const mailboxes = rows.map((row) => {
      const totalSent = Number(row.total_sent ?? 0);
      const totalOpened = Number(row.total_opened ?? 0);
      const totalReplied = Number(row.total_replied ?? 0);
      const totalBounced = Number(row.total_bounced ?? 0);
      const spamComplaints = Number(row.spam_complaints ?? 0);

      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

      let raw = 100 - bounceRate * 2 + openRate * 0.2 - spamComplaints * 5;
      const overallScore = Math.max(0, Math.min(100, Math.round(raw)));

      return {
        email: row.email,
        overallScore,
        bounceRate: Math.round(bounceRate * 10) / 10,
        openRate: Math.round(openRate * 10) / 10,
        replyRate: Math.round(replyRate * 10) / 10,
        spamComplaints,
        recommendation: getRecommendation(bounceRate, openRate, replyRate, spamComplaints),
      };
    });

    return NextResponse.json(
      { mailboxes },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[deliverability] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverability data" },
      { status: 500 }
    );
  }
}
