/**
 * Shared client-side helpers for the INR / USD dual-currency flow.
 *
 * The user picks a currency on /pricing (or the app auto-detects it from
 * their browser locale/timezone). That choice is persisted to localStorage
 * so ChangePlanModal + billing views on downstream pages pick it up
 * without prop-drilling.
 *
 * Server routes remain the source of truth for actual prices — see
 * `getPlanAmount(plan, billing, currency)` in `lib/payments/razorpay.ts`.
 * The frontend numbers here must stay in lockstep with those constants.
 */

import { INR_PER_USD, type SupportedCurrency } from "./razorpay";

export type Currency = SupportedCurrency;

const STORAGE_KEY = "aryasdr.currency.preferred";

/**
 * True if any of the given phone numbers has a +91 country code — the
 * highest-priority signal that a signed-in user is Indian. Overrides
 * both stored preference and browser locale.
 */
export function isIndianByPhone(
  phones: (string | null | undefined)[] | null | undefined
): boolean {
  if (!phones || phones.length === 0) return false;
  return phones.some((p) => {
    if (!p) return false;
    // Strip separators so "+91 62018 35709" also matches. Country codes
    // never contain digits shared with +9XX so a startsWith check is safe.
    return p.replace(/[\s-()]/g, "").startsWith("+91");
  });
}

/**
 * True if the browser locale looks Indian (Asia/Kolkata timezone or an
 * *-IN language). Server-side always returns false — this is the client
 * fallback used when no Clerk phone is available yet.
 */
export function isIndianByLocale(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = (navigator.language ?? "").toLowerCase();
    return (
      tz === "Asia/Kolkata" ||
      tz === "Asia/Calcutta" ||
      lang.endsWith("-in") ||
      lang === "hi"
    );
  } catch {
    return false;
  }
}

/**
 * Best-effort auto-detect. Any of these signals a non-Indian user:
 *   - browser timezone is not Asia/Kolkata
 *   - browser language is not en-IN / hi-IN / any *-IN
 * Falls back to INR when we can't tell (e.g. locked-down browser).
 */
export function detectCurrencyFromBrowser(): Currency {
  return isIndianByLocale() ? "INR" : "USD";
}

/**
 * Resolve the user's currency in priority order:
 *   1. Clerk phone with +91 → INR (locked — cannot be overridden)
 *   2. Stored preference (localStorage) if the user has manually toggled
 *      AND the phone check didn't force a lock
 *   3. Browser locale detection
 *   4. INR as ultimate fallback
 */
export function resolveCurrency(opts: {
  phones?: (string | null | undefined)[] | null;
}): { currency: Currency; locked: boolean } {
  if (isIndianByPhone(opts.phones)) {
    return { currency: "INR", locked: true };
  }
  const stored = readStoredCurrency();
  if (stored) return { currency: stored, locked: false };
  return { currency: detectCurrencyFromBrowser(), locked: false };
}

export function readStoredCurrency(): Currency | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "INR" || v === "USD") return v;
  } catch {
    /* localStorage disabled — ignore */
  }
  return null;
}

export function writeStoredCurrency(currency: Currency): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    /* localStorage disabled — best-effort */
  }
}

/* ---------------- formatting ---------------- */

const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Format an amount already denominated in the given currency. */
export function formatMoney(amount: number, currency: Currency): string {
  return currency === "USD" ? usdFmt.format(amount) : inrFmt.format(amount);
}

/**
 * Convert an INR display amount (whole rupees) to the equivalent USD whole
 * dollars using the fixed exchange rate. Used only for the "approx ≈"
 * secondary display on the pricing page — never for actual charges. Real
 * charge amounts come from PLAN_PRICES_USD in razorpay.ts.
 */
export function inrToUsdDisplay(inrRupees: number): number {
  return Math.round(inrRupees / INR_PER_USD);
}

/** Reverse of `inrToUsdDisplay` — approximate INR from a USD display value. */
export function usdToInrDisplay(usdDollars: number): number {
  return Math.round(usdDollars * INR_PER_USD);
}
