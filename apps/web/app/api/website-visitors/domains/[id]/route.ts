export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { trackedDomains } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureWebsiteVisitorsSchema } from "@/lib/db/ensure-schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureWebsiteVisitorsSchema();

    const result = await db
      .delete(trackedDomains)
      .where(and(eq(trackedDomains.id, params.id), eq(trackedDomains.userId, user.id)))
      .returning({ id: trackedDomains.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
