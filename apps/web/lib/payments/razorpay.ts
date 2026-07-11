import Razorpay from "razorpay";

let _razorpay: Razorpay | null = null;

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
