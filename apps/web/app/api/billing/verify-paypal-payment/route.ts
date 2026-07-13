export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions, payments } from "@/lib/db/schema";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/payments/paypal";
import { getPlanAmount, getAddonUnitPrice } from "@/lib/payments/razorpay";

/**
 * Companion to /api/billing/create-paypal-order. Fires after PayPal reports
 * approval on the client. Same DB update semantics as
 * /api/billing/verify-payment (Razorpay path):
 *
 *   1. Capture the PayPal order (moves funds).
 *   2. Recompute the expected USD amount server-side from the same plan /
 *      type / quantity constants and refuse if the captured amount is off
 *      by more than 1 cent. Prevents a client that says "starter" but
 *      opened an order for "scale" from getting the wrong tier recorded.
 *   3. Insert a payments row (currency USD, provider "paypal").
 *   4. Upsert the subscription row: tier, status active, period dates,
 *      leadsLimit by tier; credits/add-ons just bump leadsLimit.
 */

type Plan = "starter" | "growth" | "scale";
type Billing = "monthly" | "yearly";
type PurchaseType = "credits" | "dialer" | "mailbox" | "phone";

interface VerifyBody {
  paypalOrderId: string;
  plan?: Plan;
  billing?: Billing;
  type?: PurchaseType;
  quantity?: number;
}

export async function POST(req: Request) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "International payments aren't set up on this account yet." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Partial<VerifyBody>;
  const { paypalOrderId, plan, billing, type, quantity } = body;
  if (!paypalOrderId) {
    return NextResponse.json(
      { error: "Missing paypalOrderId" },
      { status: 400 }
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Recompute the expected amount from the same constants create-paypal-
  // order used. If the captured amount doesn't match, refuse to update the
  // subscription — the user paid but we won't apply a wrong tier.
  let expectedCents = 0;
  if (plan === "starter" || plan === "growth" || plan === "scale") {
    expectedCents = getPlanAmount(
      plan,
      billing === "yearly" ? "yearly" : "monthly",
      "USD"
    ) ?? 0;
  } else if (
    type === "credits" ||
    type === "dialer" ||
    type === "mailbox" ||
    type === "phone"
  ) {
    const qty = Number(quantity) || 0;
    expectedCents = qty * getAddonUnitPrice(type, "USD");
  }
  if (expectedCents <= 0) {
    return NextResponse.json({ error: "Invalid plan or type" }, { status: 400 });
  }

  let captured;
  try {
    captured = await capturePayPalOrder(paypalOrderId);
  } catch (err) {
    console.error("[verify-paypal] capture failed:", err);
    return NextResponse.json(
      { error: "Payment capture failed. Please try again." },
      { status: 502 }
    );
  }
  if (captured.status !== "COMPLETED") {
    return NextResponse.json(
      { error: `Capture status ${captured.status}` },
      { status: 402 }
    );
  }
  if (Math.abs(captured.amountCents - expectedCents) > 1) {
    console.error(
      "[verify-paypal] amount mismatch",
      { captured: captured.amountCents, expected: expectedCents }
    );
    return NextResponse.json(
      { error: "Payment amount mismatch. Contact support." },
      { status: 409 }
    );
  }

  await db.insert(payments).values({
    userId: user.id,
    amount: captured.amountCents,
    currency: "USD",
    status: "succeeded",
    provider: "paypal",
    providerPaymentId: captured.id,
    providerOrderId: paypalOrderId,
    description: `${plan ?? type} purchase (PayPal)`,
  });

  if (plan === "starter" || plan === "growth" || plan === "scale") {
    const now = new Date();
    const cycleMs =
      billing === "yearly"
        ? 365 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    const periodEnd = new Date(now.getTime() + cycleMs);
    const leadsLimit =
      plan === "starter" ? 5000 : plan === "growth" ? 15000 : 999999;

    const updated = await db
      .update(subscriptions)
      .set({
        tier: plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        leadsLimit,
        trialEndsAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, user.id))
      .returning({ id: subscriptions.id });

    if (updated.length === 0) {
      await db.insert(subscriptions).values({
        userId: user.id,
        tier: plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        leadsLimit,
        leadsUsed: 0,
      });
    }
  } else if (type === "credits") {
    const qty = Number(quantity) || 0;
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, user.id),
    });
    if (existing) {
      await db
        .update(subscriptions)
        .set({
          leadsLimit: (existing.leadsLimit ?? 0) + qty,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, user.id));
    } else {
      await db.insert(subscriptions).values({
        userId: user.id,
        tier: "free",
        status: "active",
        leadsLimit: qty,
        leadsUsed: 0,
      });
    }
  }

  return NextResponse.json({ success: true, plan, type });
}
