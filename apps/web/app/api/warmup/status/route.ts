import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS warmup_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      gmail_account VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      day_number INTEGER DEFAULT 0,
      emails_sent_today INTEGER DEFAULT 0,
      health_score INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS warmup_emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES warmup_sessions(id) ON DELETE CASCADE,
      from_email VARCHAR(255) NOT NULL,
      to_email VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      body TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      replied_at TIMESTAMPTZ,
      status VARCHAR(32) DEFAULT 'sent'
    )
  `);
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    try { await ensureTables(); } catch {}

    let rows: Array<Record<string, unknown>> = [];
    try {
      const result = await db.execute(sql`
        SELECT
          ws.id,
          ws.gmail_account,
          ws.status,
          ws.day_number,
          ws.emails_sent_today,
          ws.health_score,
          ws.started_at
        FROM warmup_sessions ws
        WHERE ws.user_id = ${user.id}::uuid
        ORDER BY ws.started_at DESC
      `);
      rows = ((result as any).rows ?? []) as Array<Record<string, unknown>>;
    } catch {}

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

    let connectedEmails: string[] = [];
    try {
      const gmailRows = await db
        .select({
          email: integrations.accountEmail,
          status: integrations.status,
        })
        .from(integrations)
        .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")));

      connectedEmails = gmailRows
        .filter((r) => r.email && r.status === "active")
        .map((r) => r.email as string);
    } catch {}

    return NextResponse.json(
      { sessions, connectedEmails },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[warmup/status] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warmup status" },
      { status: 500 }
    );
  }
}
