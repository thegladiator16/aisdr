import { NextResponse } from "next/server";
import { GmailClient } from "@/lib/integrations/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aryasdr.in";

// Start of the OAuth flow — redirect the user to Google's consent screen.
// Google will send them back to /api/v1/integrations/gmail/callback with a code.
export async function GET() {
  if (!GmailClient.isConfigured()) {
    return NextResponse.redirect(
      `${APP_URL}/integrations?error=google_not_configured`
    );
  }

  try {
    const authUrl = GmailClient.getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("[gmail:start] failed to build auth URL:", err);
    return NextResponse.redirect(
      `${APP_URL}/integrations?error=google_not_configured`
    );
  }
}
