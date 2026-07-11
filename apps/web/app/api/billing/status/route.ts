export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

/**
 * Reports whether payments are available on this deployment. Used by
 * checkout modals to render a friendly "Payments aren't set up yet"
 * banner + disable the Pay button preemptively, instead of failing on
 * click with a scary error toast.
 *
 * Intentionally public (no auth check) — the availability of payment
 * infrastructure is not a per-user secret, and letting the modal
 * pre-check without a session simplifies error UX.
 */
export function GET() {
  return NextResponse.json({
    paymentsAvailable: isRazorpayConfigured(),
  });
}
