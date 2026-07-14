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

/* ----------------- Plan pricing (INR + USD) ----------------- */

// Amounts in paise (smallest INR unit — 1 INR = 100 paise).
// Monthly prices in INR:
//   Starter: ₹6,999   Growth: ₹12,999   Scale: ₹24,999
// Yearly-billed (per-month equivalent, ~17% off):
//   Starter: ₹5,833   Growth: ₹10,833   Scale: ₹20,833
export const PLAN_PRICES_INR: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 699900, yearly: 583300 * 12 },
  growth:  { monthly: 1299900, yearly: 1083300 * 12 },
  scale:   { monthly: 2499900, yearly: 2083300 * 12 },
};

// Amounts in cents (smallest USD unit). Fixed FX at INR_PER_USD = 85 so USD
// prices ladder with INR: Starter ₹6,999 → $82, Growth ₹12,999 → $153,
// Scale ₹24,999 → $294. Yearly-per-month ~17% off.
// International charges route through PayPal via Razorpay's PayPal wallet.
export const INR_PER_USD = 85;

export const PLAN_PRICES_USD: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 8200, yearly: 6800 * 12 },
  growth:  { monthly: 15300, yearly: 12700 * 12 },
  scale:   { monthly: 29400, yearly: 24400 * 12 },
};

export type SupportedCurrency = "INR" | "USD";

export function getPlanAmount(
  plan: string,
  billing: "monthly" | "yearly" = "monthly",
  currency: SupportedCurrency = "INR"
): number | null {
  const map = currency === "USD" ? PLAN_PRICES_USD : PLAN_PRICES_INR;
  const p = map[plan];
  if (!p) return null;
  return billing === "yearly" ? p.yearly : p.monthly;
}

/** Backward-compatible INR-only helper. Prefer getPlanAmount() for new code. */
export function getPlanAmountInPaise(
  plan: string,
  billing: "monthly" | "yearly" = "monthly"
): number | null {
  return getPlanAmount(plan, billing, "INR");
}

/* Add-on unit prices in the smallest unit of each currency. USD figures use
 * INR_PER_USD = 85 so a ₹25/credit → $0.29 and larger add-ons round to the
 * nearest whole dollar. Keeping them here (not sprinkled through routes)
 * means the create-order + verify-payment paths stay in sync. */
export const ADDON_UNIT_PRICES = {
  INR: {
    credits: 250,      // paise / credit  (₹2.50)
    dialer: 629900,    // paise / seat    (₹6,299)
    mailbox: 59900,    // paise / mailbox (₹599)
    phone: 49900,      // paise / number  (₹499)
  },
  USD: {
    credits: 3,        // cents / credit  ($0.03)
    dialer: 7400,      // cents / seat    ($74)
    mailbox: 700,      // cents / mailbox ($7)
    phone: 600,        // cents / number  ($6)
  },
} as const;

export function getAddonUnitPrice(
  type: "credits" | "dialer" | "mailbox" | "phone",
  currency: SupportedCurrency = "INR"
): number {
  return ADDON_UNIT_PRICES[currency][type];
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
