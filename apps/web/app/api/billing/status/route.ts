export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

/**
 * Reports whether payments are available on this deployment. Used by
 * checkout modals to render a friendly "Payments aren't set up yet"
 * banner + disable the Pay button preemptively.
 *
 * Public by design. The answer only changes on redeploy, so cache it
 * aggressively at the edge.
 */
export function GET() {
  return NextResponse.json(
    { paymentsAvailable: isRazorpayConfigured() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
