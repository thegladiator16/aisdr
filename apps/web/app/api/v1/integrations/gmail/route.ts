import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { GmailClient } from "@/lib/integrations/gmail";
import { db } from "@/lib/db";
import { integrations } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://aisdr-web.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!GmailClient.isConfigured()) {
    return NextResponse.redirect(
      `${APP_URL}/integrations?error=google_not_configured`
    );
  }

  if (!code) {
    try {
      const authUrl = GmailClient.getAuthUrl();
      return NextResponse.redirect(authUrl);
    } catch {
      return NextResponse.redirect(
        `${APP_URL}/integrations?error=google_not_configured`
      );
    }
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

    return NextResponse.redirect(`${APP_URL}/integrations?connected=Gmail`);
  } catch {
    return NextResponse.redirect(`${APP_URL}/integrations?error=gmail_failed`);
  }
}
