import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const result = await db.execute(sql`
      UPDATE warmup_sessions
      SET status = 'paused', updated_at = now()
      WHERE user_id = ${user.id}::uuid
        AND gmail_account = ${gmailAccount}
        AND status = 'active'
      RETURNING id
    `);

    if (!(result as any).rows?.length) {
      return NextResponse.json(
        { error: "No active warmup session found for this account" },
        { status: 404 }
      );
    }

    const sessionId = ((result as any).rows[0] as { id: string }).id;
    return NextResponse.json({ sessionId, status: "paused" });
  } catch (error) {
    console.error("[warmup/stop] error:", error);
    return NextResponse.json(
      { error: "Failed to stop warmup" },
      { status: 500 }
    );
  }
}
