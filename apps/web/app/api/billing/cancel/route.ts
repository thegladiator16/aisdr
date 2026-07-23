import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();

    await db.execute(sql`
      UPDATE subscriptions
      SET status = 'cancelled',
          cancelled_at = now(),
          updated_at = now()
      WHERE user_id = ${user.id}::uuid
    `);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/billing/cancel] error", err);
    return NextResponse.json(
      { success: false, error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
