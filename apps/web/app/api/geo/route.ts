import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const runtime = "edge";

/**
 * Returns the visitor's country as detected by Vercel's edge network. The
 * client uses this to lock the pricing currency: India → INR only,
 * everyone else → USD only. No auth required (public pricing page uses it).
 *
 * Cached at the edge keyed by the country header — same country → same
 * response for an hour, so the pricing page doesn't re-invoke this per
 * page load.
 */
export function GET() {
  const h = headers();
  const country =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    null;

  return NextResponse.json(
    { country, isIndia: country === "IN" },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        Vary: "x-vercel-ip-country, cf-ipcountry",
      },
    }
  );
}
