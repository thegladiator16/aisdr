import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const PLAN_PRICES_INR: Record<string, number> = {
  starter: 1500000,
  growth: 3000000,
  scale: 5000000,
};

export async function createRazorpayOrder(planId: string, userId: string) {
  const amount = PLAN_PRICES_INR[planId];
  if (!amount) throw new Error(`Unknown plan: ${planId}`);

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: `aisdr_${userId}_${Date.now()}`,
    notes: { userId, planId },
  });

  return order;
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const crypto = require("crypto") as typeof import("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expectedSignature === signature;
}
