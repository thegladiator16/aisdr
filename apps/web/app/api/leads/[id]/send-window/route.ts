import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import { and, eq } from "drizzle-orm";
import { getCachedOrRefreshWindow } from "./_lib";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    const owned = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, params.id), eq(leads.userId, user.id)))
      .limit(1);
    if (!owned[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = await getCachedOrRefreshWindow(user.id, params.id);
    return NextResponse.json({ data: row });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
