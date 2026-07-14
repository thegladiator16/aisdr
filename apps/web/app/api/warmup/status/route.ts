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
    const result = await db.execute(sql`
      SELECT
        ws.id,
        ws.gmail_account,
        ws.status,
        ws.day_number,
        ws.emails_sent_today,
        ws.health_score,
        ws.started_at,
        (SELECT COUNT(*) FROM warmup_emails we WHERE we.session_id = ws.id) AS total_emails,
        (SELECT COUNT(*) FROM warmup_emails we WHERE we.session_id = ws.id AND we.replied_at IS NOT NULL) AS total_replies,
        (SELECT COUNT(*) FROM warmup_emails we WHERE we.session_id = ws.id AND we.status = 'bounced') AS total_bounces
      FROM warmup_sessions ws
      WHERE ws.user_id = ${user.id}::uuid
      ORDER BY ws.started_at DESC
    `);

    const rows = ((result as any).rows ?? []) as Array<Record<string, unknown>>;

    const sessions = rows.map((row) => {
      const dayNumber = Number(row.day_number ?? 0);
      const dailyLimit = Math.min(50, 5 + dayNumber * 2);
      const estimatedDaysRemaining = Math.max(0, Math.ceil((50 - dailyLimit) / 2));

      return {
        id: row.id as string,
        email: row.gmail_account as string,
        status: row.status as string,
        healthScore: Number(row.health_score ?? 0),
        emailsSentToday: Number(row.emails_sent_today ?? 0),
        dailyLimit,
        daysActive: dayNumber,
        estimatedDaysRemaining,
        startedAt: row.started_at as string,
      };
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[warmup/status] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warmup status" },
      { status: 500 }
    );
  }
}
