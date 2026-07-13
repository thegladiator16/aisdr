export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createPayPalOrder,
  isPayPalConfigured,
} from "@/lib/payments/paypal";
import { getPlanAmount, getAddonUnitPrice } from "@/lib/payments/razorpay";
import { isIndianByPhone } from "@/lib/payments/currency";

/**
 * Server-side order creation for the PayPal flow. Called by the client's
 * PayPalButtons.createOrder callback. Everything price-sensitive is derived
 * server-side; the client only picks the plan/type/quantity.
 *
 * Guards:
 *   1. Clerk auth required.
 *   2. PayPal must be configured (PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET
 *      + NEXT_PUBLIC_PAYPAL_CLIENT_ID). Missing env → 503 with an actionable
 *      error code so the client can render a friendly banner.
 *   3. +91 Clerk phone → 403 with CURRENCY_LOCKED_INR. The client can send
 *      currency=USD all it wants; if the user's Clerk profile says they're
 *      Indian, we refuse and force them back to the Razorpay INR flow.
 */
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      {
        error: "International payments aren't set up on this account yet.",
        code: "PAYPAL_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  // Server-side phone check — the definitive lock. Client-side lock is a
  // convenience for the toggle UI, but the source of truth is this call.
  try {
    const user = await clerkClient.users.getUser(userId);
    const phones = user.phoneNumbers.map((p) => p.phoneNumber);
    if (isIndianByPhone(phones)) {
      return NextResponse.json(
        {
          error: "You are in India. Please pay in INR.",
          code: "CURRENCY_LOCKED_INR",
        },
        { status: 403 }
      );
    }
  } catch {
    // If Clerk lookup fails we let the order continue (fail-open) — the
    // client would have already been showing USD, and refusing here would
    // strand paying customers on a transient Clerk hiccup. The Razorpay
    // path has the same failure mode.
  }

  const body = await req.json().catch(() => ({}));
  const {
    plan,
    billing,
    type,
    quantity,
  }: {
    plan?: "starter" | "growth" | "scale";
    billing?: "monthly" | "yearly";
    type?: "credits" | "dialer" | "mailbox" | "phone";
    quantity?: number;
  } = body ?? {};

  let amountCents = 0;
  let description = "AryaSDR subscription";

  if (plan === "starter" || plan === "growth" || plan === "scale") {
    const price = getPlanAmount(
      plan,
      billing === "yearly" ? "yearly" : "monthly",
      "USD"
    );
    if (!price) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    amountCents = price;
    description = `${plan[0].toUpperCase()}${plan.slice(1)} plan — ${
      billing === "yearly" ? "yearly" : "monthly"
    }`;
  } else if (
    type === "credits" ||
    type === "dialer" ||
    type === "mailbox" ||
    type === "phone"
  ) {
    const qty = Number(quantity) || 0;
    amountCents = qty * getAddonUnitPrice(type, "USD");
    description = `${qty.toLocaleString("en-US")} × ${type}`;
  } else {
    return NextResponse.json(
      { error: "Invalid plan or type" },
      { status: 400 }
    );
  }

  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const order = await createPayPalOrder({
      amountCents,
      description,
      referenceId: `aryasdr_${userId}_${Date.now()}`.slice(0, 100),
    });
    return NextResponse.json({
      id: order.id,
      status: order.status,
      amountCents,
      currency: "USD",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-paypal-order] PayPal error:", msg);
    return NextResponse.json(
      {
        error: "Payment provider is having trouble right now. Please try again shortly.",
        code: "PAYPAL_CREATE_FAILED",
      },
      { status: 502 }
    );
  }
}
