export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listRuns } from "@/lib/agents";

/** GET /api/agents/runs → the current user's most recent agent runs
 *  (up to 50), newest first. Powers the /dashboard/agents index. */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const runs = await listRuns(user.id, 50);
  return NextResponse.json({ data: runs });
}
