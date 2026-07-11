export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await requireUser();
    const integrations = await getUserIntegrations(user.id);
    const connected = new Set(
      integrations.filter((i) => i.accessToken).map((i) => i.type)
    );
    return NextResponse.json({
      gmail: connected.has("gmail"),
    });
  } catch {
    return NextResponse.json({ gmail: false }, { status: 200 });
  }
}
