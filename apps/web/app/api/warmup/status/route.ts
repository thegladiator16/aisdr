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
    const sessions = await db.execute(sql`
      SELECT
        ws.*,
        (SELECT COUNT(*) FROM warmup_emails we WHERE we.session_id = ws.id) AS total_emails,
        (SELECT COUNT(*) FROM warmup_emails we WHERE we.session_id = ws.id AND we.replied_at IS NOT NULL) AS total_replies,
        (SELECT COUNT(*) FROM warmup_emails we WHERE we.session_id = ws.id AND we.status = 'bounced') AS total_bounces
      FROM warmup_sessions ws
      WHERE ws.user_id = ${user.id}::uuid
      ORDER BY ws.started_at DESC
    `);

    return NextResponse.json({ sessions: (sessions as any).rows });
  } catch (error) {
    console.error("[warmup/status] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warmup status" },
      { status: 500 }
    );
  }
}
