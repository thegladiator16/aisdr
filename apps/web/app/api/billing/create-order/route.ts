export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  razorpay,
  getPlanAmount,
  getAddonUnitPrice,
  isRazorpayConfigured,
  type SupportedCurrency,
} from "@/lib/payments/razorpay";
import { isIndianByPhone } from "@/lib/payments/currency";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gate BEFORE hitting the Razorpay proxy so we return a stable, safe
  // client-facing error instead of the proxy's exception (which will surface
  // as a scary error message). A specific error code lets the client render
  // a friendly "Payments aren't set up yet" state.
  if (!isRazorpayConfigured()) {
    console.error(
      "[create-order] Razorpay not configured — RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing on server"
    );
    return NextResponse.json(
      {
        error: "Payments aren't set up on this account yet. Please contact support.",
        code: "PAYMENTS_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const {
    plan,
    billing,
    type,
    quantity,
    currency: rawCurrency,
  }: {
    plan?: "starter" | "growth" | "scale";
    billing?: "monthly" | "yearly";
    type?: "credits" | "dialer" | "mailbox" | "phone";
    quantity?: number;
    currency?: string;
  } = body ?? {};

  // Currency: INR is the default; USD is the international route.
  let currency: SupportedCurrency =
    (typeof rawCurrency === "string" ? rawCurrency.toUpperCase() : "INR") === "USD"
      ? "USD"
      : "INR";

  // Definitive server-side geo + phone lock — client toggle can lie / be
  // stale, so we always re-check both and force the correct currency.
  // Priority: Vercel edge geo header (authoritative) > Clerk +91 phone.
  const h = headers();
  const country =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    null;
  if (country === "IN") {
    currency = "INR";
  } else if (country && country !== "IN") {
    // Definite non-India signal — but still honor +91 phone below since a
    // traveling Indian customer should be able to pay in INR.
    if (currency !== "USD") currency = "USD";
  }
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const phones = clerkUser.phoneNumbers.map((p) => p.phoneNumber);
    if (isIndianByPhone(phones) && currency === "USD") {
      currency = "INR";
    }
  } catch {
    // Clerk lookup hiccup — trust the geo/request currency to avoid
    // stranding paying customers. Same fail-open pattern as verify-payment.
  }

  let amount = 0;

  if (plan === "starter" || plan === "growth" || plan === "scale") {
    const price = getPlanAmount(
      plan,
      billing === "yearly" ? "yearly" : "monthly",
      currency
    );
    if (!price) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    amount = price;
  } else if (
    type === "credits" ||
    type === "dialer" ||
    type === "mailbox" ||
    type === "phone"
  ) {
    const qty = Number(quantity) || 0;
    amount = qty * getAddonUnitPrice(type, currency);
  } else {
    return NextResponse.json(
      { error: "Invalid plan or type" },
      { status: 400 }
    );
  }

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "Invalid amount" },
      { status: 400 }
    );
  }

  // GST (18%) applies only to INR — international sales are outside the
  // Indian tax net at the merchant side. USD amounts go through as-is.
  const finalAmount =
    currency === "INR" ? Math.round(amount * 1.18) : amount;

  try {
    const order = await razorpay.orders.create({
      amount: finalAmount,
      currency,
      receipt: `aryasdr_${userId}_${Date.now()}`.slice(0, 40),
      notes: {
        userId,
        plan: plan ?? "",
        billing: billing ?? "",
        type: type ?? "",
        quantity: quantity != null ? String(quantity) : "",
        currency,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("[create-order] Razorpay error:", {
      message: err?.message,
      description: err?.error?.description,
      code: err?.error?.code,
      statusCode: err?.statusCode,
    });

    // Route the "not configured" case through the friendly 503 above rather
    // than the generic 502 — this preserves the correct code path if a race
    // or first-request-after-cold-start ever slips past the pre-check.
    if (err?.message === "PAYMENTS_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Payments aren't set up on this account yet. Please contact support.",
          code: "PAYMENTS_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    // For every other Razorpay error, surface a customer-safe message only.
    // Razorpay's own error.description (if present) is safe — it comes from
    // the payment provider and is designed for end-user display. The raw
    // err.message is NOT safe (may include env var names / stack info).
    const safeDetail =
      typeof err?.error?.description === "string"
        ? err.error.description
        : "Payment provider is having trouble right now. Please try again shortly.";
    return NextResponse.json(
      { error: "Payment provider error", detail: safeDetail },
      { status: 502 }
    );
  }
}
