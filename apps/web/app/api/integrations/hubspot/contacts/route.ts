import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  isHubSpotConfigured,
  pullContactsFromHubspot,
} from "@/lib/integrations/hubspot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isHubSpotConfigured()) {
    return NextResponse.json(
      { error: "HubSpot is not configured. Set HUBSPOT_API_KEY in your environment." },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? "50"), 1),
      100
    );

    const contacts = await pullContactsFromHubspot(limit);
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("[integrations/hubspot/contacts] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to pull contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
