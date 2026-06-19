import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Amounts in smallest currency unit (cents for USD).
// Razorpay International supports USD orders; the merchant account must be
// enabled for international payments.
export const PLAN_PRICES_USD: Record<string, number> = {
  starter: 19900, // $199.00
  growth: 34900,  // $349.00
  scale: 59900,   // $599.00
};

export async function createRazorpayOrder(planId: string, userId: string) {
  const amount = PLAN_PRICES_USD[planId];
  if (!amount) throw new Error(`Unknown plan: ${planId}`);

  const order = await razorpay.orders.create({
    amount,
    currency: "USD",
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
