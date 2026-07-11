export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { signalSubscriptions } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureSignalSubscriptionsTable } from "@/lib/db/ensure-schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureSignalSubscriptionsTable();

    const result = await db
      .delete(signalSubscriptions)
      .where(
        and(
          eq(signalSubscriptions.id, params.id),
          eq(signalSubscriptions.userId, user.id)
        )
      )
      .returning({ id: signalSubscriptions.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
