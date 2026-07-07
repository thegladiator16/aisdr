export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { razorpay, PLAN_PRICES_USD } from "@/lib/payments/razorpay";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    plan,
    type,
    quantity,
  }: {
    plan?: "starter" | "growth";
    type?: "credits" | "dialer" | "mailbox" | "phone";
    quantity?: number;
    subtotal?: number;
    tax?: number;
    total?: number;
  } = body ?? {};

  // Compute amount server-side. NEVER trust client-sent amounts.
  let amount = 0;

  if (plan === "starter" || plan === "growth") {
    amount = PLAN_PRICES_USD[plan];
  } else if (type === "credits") {
    const qty = Number(quantity) || 0;
    amount = qty * 3; // 3 cents per credit ($0.03/credit)
  } else if (type === "dialer") {
    const qty = Number(quantity) || 0;
    amount = qty * 7500; // $75.00 per seat
  } else if (type === "mailbox") {
    const qty = Number(quantity) || 0;
    amount = qty * 700; // $7.00 per mailbox
  } else if (type === "phone") {
    const qty = Number(quantity) || 0;
    amount = qty * 600; // $6.00 per phone
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

  // Add 18% GST on top
  const taxedAmount = Math.round(amount * 1.18);

  try {
    const order = await razorpay.orders.create({
      amount: taxedAmount,
      currency: "USD",
      receipt: `aryasdr_${userId}_${Date.now()}`,
      notes: {
        userId,
        plan: plan ?? "",
        type: type ?? "",
        quantity: quantity != null ? String(quantity) : "",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    const detail =
      err?.error?.description ||
      err?.message ||
      "Unknown Razorpay error";
    return NextResponse.json(
      { error: "Payment provider error", detail },
      { status: 502 }
    );
  }
}
