import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { GmailClient } from "@/lib/integrations/gmail";
import { db } from "@/lib/db";
import { integrations } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    const authUrl = GmailClient.getAuthUrl();
    return NextResponse.redirect(authUrl);
  }

  try {
    const user = await requireUser();
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/integrations?connected=gmail`);
  } catch {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/integrations?error=gmail_failed`);
  }
}
