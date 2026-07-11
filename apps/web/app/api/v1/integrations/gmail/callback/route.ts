import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { GmailClient } from "@/lib/integrations/gmail";
import { db } from "@/lib/db";
import { integrations } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aryasdr.in";

// Google OAuth callback — Google sends the user here after they consent.
// This URL must be listed under "Authorized redirect URIs" in the OAuth 2.0
// Client ID in Google Cloud Console:
//   https://aryasdr.in/api/v1/integrations/gmail/callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    console.error(`[gmail:callback] Google returned error: ${errorParam}`);
    return NextResponse.redirect(
      `${APP_URL}/settings/integrations?error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${APP_URL}/settings/integrations?error=missing_code`
    );
  }

  if (!GmailClient.isConfigured()) {
    return NextResponse.redirect(
      `${APP_URL}/settings/integrations?error=google_not_configured`
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${APP_URL}/sign-in`);
    }

    const tokens = await GmailClient.exchangeCode(code);

    const existing = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")))
      .limit(1);

    if (existing[0]) {
      await db
        .update(integrations)
        .set({
          accessToken: tokens.access_token ?? undefined,
          refreshToken: tokens.refresh_token ?? undefined,
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
          scope: tokens.scope ?? undefined,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing[0].id));
    } else {
      await db.insert(integrations).values({
        userId: user.id,
        type: "gmail",
        accessToken: tokens.access_token ?? undefined,
        refreshToken: tokens.refresh_token ?? undefined,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
        scope: tokens.scope ?? undefined,
        status: "active",
      });
    }

    return NextResponse.redirect(`${APP_URL}/settings/integrations?connected=Gmail`);
  } catch (err) {
    console.error("[gmail:callback] token exchange or DB write failed:", err);
    return NextResponse.redirect(`${APP_URL}/settings/integrations?error=gmail_failed`);
  }
}
