export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions, payments } from "@/lib/db/schema";
import {
  verifyRazorpaySignature,
  getPlanAmountInPaise,
} from "@/lib/payments/razorpay";

type Plan = "starter" | "growth" | "scale";
type Billing = "monthly" | "yearly";
type PurchaseType = "credits" | "dialer" | "mailbox" | "phone";

interface VerifyPaymentBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan?: Plan;
  billing?: Billing;
  type?: PurchaseType;
  quantity?: number;
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<VerifyPaymentBody>;
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
    billing,
    type,
    quantity,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { error: "Missing payment verification fields" },
      { status: 400 }
    );
  }

  // Verify HMAC signature
  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Look up the internal user record from Clerk id
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Compute amount server-side (paise), same rules as create-order
  let amount = 0;
  if (plan === "starter" || plan === "growth" || plan === "scale") {
    amount = getPlanAmountInPaise(plan, billing === "yearly" ? "yearly" : "monthly") ?? 0;
  } else if (type === "credits") {
    const qty = Number(quantity) || 0;
    amount = qty * 250;
  } else if (type === "dialer") {
    const qty = Number(quantity) || 0;
    amount = qty * 629900;
  } else if (type === "mailbox") {
    const qty = Number(quantity) || 0;
    amount = qty * 59900;
  } else if (type === "phone") {
    const qty = Number(quantity) || 0;
    amount = qty * 49900;
  }

  // Record the payment
  await db.insert(payments).values({
    userId: user.id,
    amount,
    currency: "INR",
    status: "succeeded",
    provider: "razorpay",
    providerPaymentId: razorpay_payment_id,
    providerOrderId: razorpay_order_id,
    description: `${plan ?? type} purchase`,
  });

  // Update subscription based on purchase kind
  if (plan === "starter" || plan === "growth" || plan === "scale") {
    const now = new Date();
    const cycleMs =
      billing === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const periodEnd = new Date(now.getTime() + cycleMs);
    const leadsLimit =
      plan === "starter" ? 500 : plan === "growth" ? 2000 : 999999;

    await db
      .update(subscriptions)
      .set({
        tier: plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        leadsLimit,
        trialEndsAt: null,
      })
      .where(eq(subscriptions.userId, user.id));
  } else if (type === "credits") {
    const qty = Number(quantity) || 0;
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, user.id),
    });
    const currentLimit = existing?.leadsLimit ?? 0;

    await db
      .update(subscriptions)
      .set({ leadsLimit: currentLimit + qty })
      .where(eq(subscriptions.userId, user.id));
  }

  return NextResponse.json({ success: true, plan, type });
}
