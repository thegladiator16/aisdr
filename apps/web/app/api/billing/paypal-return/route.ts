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
 * PayPal Standard Checkout redirect handler. Called by PayPal AFTER the
 * customer approves the payment on paypal.com. Query params:
 *   token = the PayPal order id (PayPal's naming)
 *   plan / billing / type / quantity = passed through from create-paypal-order
 *
 * Flow (mirrors verify-paypal-payment but wraps the browser round-trip):
 *   1. Auth via Clerk cookie.
 *   2. Capture the order (moves funds).
 *   3. Server-side amount recompute + mismatch guard.
 *   4. Insert payments row (currency USD, provider "paypal").
 *   5. Upsert subscription with the same tier/period/leadsLimit rules.
 *   6. 302 redirect to /settings/billing with paypal=success (or =error).
 *
 * The redirect is what makes the button "work" from the user's POV — the
 * browser lands back on the billing page and the subscription reflects the
 * new tier on next render.
 */
type Plan = "starter" | "growth" | "scale";
type Billing = "monthly" | "yearly";
type PurchaseType = "credits" | "dialer" | "mailbox" | "phone";

function fail(origin: string, code: string) {
  return NextResponse.redirect(
    `${origin}/settings/billing?paypal=error&code=${encodeURIComponent(code)}`,
    { status: 302 }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const { userId: clerkId } = auth();
  if (!clerkId) return fail(origin, "unauthorized");
  if (!isPayPalConfigured()) return fail(origin, "not_configured");

  const orderId = url.searchParams.get("token");
  if (!orderId) return fail(origin, "missing_token");

  const plan = url.searchParams.get("plan") as Plan | null;
  const billing = url.searchParams.get("billing") as Billing | null;
  const type = url.searchParams.get("type") as PurchaseType | null;
  const quantityRaw = url.searchParams.get("quantity");
  const quantity = quantityRaw != null ? Number(quantityRaw) : undefined;

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (!user) return fail(origin, "user_not_found");

  // Recompute expected amount from the same helpers create-paypal-order
  // used. If capture disagrees, refuse to touch the subscription.
  let expectedCents = 0;
  if (plan === "starter" || plan === "growth" || plan === "scale") {
    expectedCents =
      getPlanAmount(plan, billing === "yearly" ? "yearly" : "monthly", "USD") ?? 0;
  } else if (
    type === "credits" ||
    type === "dialer" ||
    type === "mailbox" ||
    type === "phone"
  ) {
    const qty = Number(quantity) || 0;
    expectedCents = qty * getAddonUnitPrice(type, "USD");
  }
  if (expectedCents <= 0) return fail(origin, "invalid_purchase");

  let captured;
  try {
    captured = await capturePayPalOrder(orderId);
  } catch (err) {
    console.error("[paypal-return] capture failed:", err);
    return fail(origin, "capture_failed");
  }
  if (captured.status !== "COMPLETED") {
    return fail(origin, `capture_status_${captured.status.toLowerCase()}`);
  }
  if (Math.abs(captured.amountCents - expectedCents) > 1) {
    console.error("[paypal-return] amount mismatch", {
      captured: captured.amountCents,
      expected: expectedCents,
    });
    return fail(origin, "amount_mismatch");
  }

  await db.insert(payments).values({
    userId: user.id,
    amount: captured.amountCents,
    currency: "USD",
    status: "succeeded",
    provider: "paypal",
    providerPaymentId: captured.id,
    providerOrderId: orderId,
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

  return NextResponse.redirect(
    `${origin}/settings/billing?paypal=success`,
    { status: 302 }
  );
}
