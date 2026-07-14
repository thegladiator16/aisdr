import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aryasdr.in";

// OAuth callback is no longer used — Gmail now uses SMTP with App Password.
// Redirect anyone who hits this URL back to the integrations page.
export async function GET() {
  return NextResponse.redirect(`${APP_URL}/settings/integrations`);
}
