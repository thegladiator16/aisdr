export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await requireUser();
    const integrations = await getUserIntegrations(user.id);
    const gmailRow = integrations.find((i) => i.type === "gmail");
    const cfg = (gmailRow?.config ?? {}) as Record<string, unknown>;
    const gmailConnected = !!(
      gmailRow?.accessToken &&
      gmailRow?.accountEmail &&
      cfg.connection_type === "smtp"
    );
    return NextResponse.json({
      gmail: gmailConnected,
    });
  } catch {
    return NextResponse.json({ gmail: false }, { status: 200 });
  }
}
