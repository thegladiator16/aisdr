import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
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

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { gmailAccount?: string };
  try {
    body = (await req.json()) as { gmailAccount?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const gmailAccount = body.gmailAccount?.trim();
  if (!gmailAccount) {
    return NextResponse.json(
      { error: "Gmail account required" },
      { status: 400 }
    );
  }

  try {
    await ensureTables();

    const existing = await db.execute(sql`
      SELECT id, status FROM warmup_sessions
      WHERE user_id = ${user.id}::uuid AND gmail_account = ${gmailAccount}
      LIMIT 1
    `);

    if ((existing as any).rows?.length) {
      const session = (existing as any).rows[0] as { id: string; status: string };

      if (session.status === "active") {
        return NextResponse.json(
          { error: "Warmup already active for this account" },
          { status: 409 }
        );
      }

      await db.execute(sql`
        UPDATE warmup_sessions
        SET status = 'active', updated_at = now()
        WHERE id = ${session.id}::uuid
      `);

      return NextResponse.json({ sessionId: session.id, status: "resumed" });
    }

    const result = await db.execute(sql`
      INSERT INTO warmup_sessions (user_id, gmail_account, status, day_number, emails_sent_today, health_score)
      VALUES (${user.id}::uuid, ${gmailAccount}, 'active', 0, 0, 0)
      RETURNING id
    `);
    const sessionId = ((result as any).rows?.[0] as { id: string })?.id;

    return NextResponse.json({ sessionId, status: "started" });
  } catch (error) {
    console.error("[warmup/start] error:", error);
    return NextResponse.json(
      { error: "Failed to start warmup" },
      { status: 500 }
    );
  }
}
