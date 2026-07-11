import Razorpay from "razorpay";

let _razorpay: Razorpay | null = null;

/** Non-throwing config check for callers that want to gate UI or return a
 * friendly "not configured" error to the client without triggering the
 * proxy's exception path (which surfaces a message that mentions env var
 * names — never safe to leak to a browser). */
export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getRazorpay(): Razorpay {
  if (_razorpay) return _razorpay;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    // Message is intentionally opaque — this exception bubbles to any caller
    // that reaches the proxy without gating on isRazorpayConfigured() first,
    // and its .message must not leak env var names to the browser. Callers
    // should use isRazorpayConfigured() and return their own friendly error.
    throw new Error("PAYMENTS_NOT_CONFIGURED");
  }
  _razorpay = new Razorpay({ key_id, key_secret });
  return _razorpay;
}

export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop) {
    const client = getRazorpay();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") return (value as Function).bind(client);
    return value;
  },
}) as Razorpay;

// Amounts in paise (smallest INR unit — 1 INR = 100 paise).
// Monthly prices in INR:
//   Starter: ₹6,799   Growth: ₹11,599   Scale: ₹23,999
// Yearly-billed (per-month equivalent, ~10% off):
//   Starter yearly per mo: ₹5,999   Growth yearly per mo: ₹10,399
export const PLAN_PRICES_INR: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 679900, yearly: 599900 * 12 },
  growth:  { monthly: 1159900, yearly: 1039900 * 12 },
  scale:   { monthly: 2399900, yearly: 2159900 * 12 },
};

export function getPlanAmountInPaise(
  plan: string,
  billing: "monthly" | "yearly" = "monthly"
): number | null {
  const p = PLAN_PRICES_INR[plan];
  if (!p) return null;
  return billing === "yearly" ? p.yearly : p.monthly;
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
