export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { razorpay, getPlanAmountInPaise } from "@/lib/payments/razorpay";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  let amount = 0;

  if (plan === "starter" || plan === "growth" || plan === "scale") {
    const price = getPlanAmountInPaise(plan, billing === "yearly" ? "yearly" : "monthly");
    if (!price) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    amount = price;
  } else if (type === "credits") {
    const qty = Number(quantity) || 0;
    // ₹2.5 per credit = 250 paise
    amount = qty * 250;
  } else if (type === "dialer") {
    const qty = Number(quantity) || 0;
    // ₹6,299 per seat
    amount = qty * 629900;
  } else if (type === "mailbox") {
    const qty = Number(quantity) || 0;
    // ₹599 per mailbox
    amount = qty * 59900;
  } else if (type === "phone") {
    const qty = Number(quantity) || 0;
    // ₹499 per phone
    amount = qty * 49900;
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

  // 18% GST on top
  const taxedAmount = Math.round(amount * 1.18);

  try {
    const order = await razorpay.orders.create({
      amount: taxedAmount,
      currency: "INR",
      receipt: `aryasdr_${userId}_${Date.now()}`.slice(0, 40),
      notes: {
        userId,
        plan: plan ?? "",
        billing: billing ?? "",
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
    console.error("[create-order] Razorpay error:", {
      message: err?.message,
      description: err?.error?.description,
      code: err?.error?.code,
      statusCode: err?.statusCode,
    });
    const detail =
      err?.error?.description ||
      err?.message ||
      "Unknown payment provider error";
    return NextResponse.json(
      { error: "Payment provider error", detail },
      { status: 502 }
    );
  }
}
