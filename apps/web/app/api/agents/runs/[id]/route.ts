export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRunDetail } from "@/lib/agents";

/** GET /api/agents/runs/[id] → run + its tasks + their logs, in a single
 *  round-trip. Used by the run-detail drawer to render the whole trace. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const detail = await getRunDetail(user.id, params.id);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: detail });
  } catch (err) {
    console.error("[agents/runs/[id]] getRunDetail error:", err);
    return NextResponse.json({ error: "Failed to load run detail" }, { status: 500 });
  }
}
