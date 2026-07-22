import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Returns the visitor's country as detected by Vercel's edge network. The
 * client uses this to lock the pricing currency: India → INR only,
 * everyone else → USD only. No auth required (public pricing page uses it).
 */
export async function GET() {
  const h = headers();
  // Vercel injects this header on every request routed through its edge.
  // Fallback headers cover self-hosted / Cloudflare / custom proxies.
  const country =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    null;

  return NextResponse.json({
    country,
    isIndia: country === "IN",
  });
}
