export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@aisdr/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { ensureNotificationsSchema } from "../_lib";

export async function POST() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureNotificationsSchema();

    const now = new Date();
    const updated = await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.userId, user.id),
          isNull(notifications.readAt)
        )
      )
      .returning({ id: notifications.id });

    return NextResponse.json({ success: true, updated: updated.length });
  } catch (err) {
    console.error("[notifications/mark-all-read:POST] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
