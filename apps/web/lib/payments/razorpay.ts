import Razorpay from "razorpay";

let _razorpay: Razorpay | null = null;

/**
 * Lazily-instantiated Razorpay client.
 * Reading env vars at import time breaks `next build` because the API route
 * modules are evaluated before env vars are injected. This getter defers the
 * check until the request is actually being served.
 */
function getRazorpay(): Razorpay {
  if (_razorpay) return _razorpay;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error(
      "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET env vars are not set on the server"
    );
  }
  _razorpay = new Razorpay({ key_id, key_secret });
  return _razorpay;
}

/**
 * Proxy that transparently forwards to the lazily-initialized client so
 * `razorpay.orders.create(...)` still works in call sites without changes.
 */
export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop) {
    const client = getRazorpay();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") return (value as Function).bind(client);
    return value;
  },
}) as Razorpay;

// Amounts in smallest currency unit (cents for USD).
// Razorpay International supports USD orders; the merchant account must be
// enabled for international payments.
export const PLAN_PRICES_USD: Record<string, number> = {
  starter: 19900, // $199.00
  growth: 34900, //  $349.00
  scale: 59900, //   $599.00
};

export async function createRazorpayOrder(planId: string, userId: string) {
  const amount = PLAN_PRICES_USD[planId];
  if (!amount) throw new Error(`Unknown plan: ${planId}`);

  const order = await getRazorpay().orders.create({
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
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set");
  const crypto = require("crypto") as typeof import("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expectedSignature === signature;
}
