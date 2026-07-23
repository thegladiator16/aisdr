"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PayPalCheckoutButton } from "@/components/billing/PayPalCheckoutButton";
import {
  resolveCurrency,
  writeStoredCurrency,
  fetchGeoIsIndia,
  formatMoney,
  inrToUsdDisplay,
  type Currency,
} from "@/lib/payments/currency";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function displayPrice(inrAmount: number, currency: Currency): string {
  if (inrAmount === 0) return formatMoney(0, currency);
  const value = currency === "USD" ? inrToUsdDisplay(inrAmount) : inrAmount;
  return formatMoney(value, currency);
}

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    badge: "bg-violet-600",
    desc: "For B2B founders running outbound",
    monthly: 6999,
    yearly: 5833,
    credits: "3,000 credits/mo",
    replies: "100 leads in database",
    includes: "Everything in Free, plus:",
    features: [
      "3 active campaigns",
      "5 multi-agent runs/mo",
      "Gmail integration",
      "Basic sequences",
      "Intent signals",
      "Autonomous reply drafting",
      "Email support",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    badge: "bg-pink-500",
    badgeLabel: "Most Popular",
    desc: "For teams scaling with full AI automation",
    monthly: 12999,
    yearly: 10833,
    credits: "8,000 credits/mo",
    replies: "500 leads in database",
    includes: "Everything in Starter, plus:",
    features: [
      "Unlimited campaigns",
      "25 multi-agent runs/mo",
      "A/Z testing",
      "Apollo.io integration",
      "Advanced analytics",
      "CRM integrations (HubSpot)",
      "Priority support",
    ],
    recommended: true,
  },
  {
    key: "scale",
    name: "Scale",
    badge: "bg-emerald-600",
    badgeLabel: "Best Value vs Artisan",
    desc: "Full power at a fraction of Artisan's $600+/mo",
    monthly: 24999,
    yearly: 20833,
    credits: "20,000 credits/mo",
    replies: "2,000 leads in database",
    includes: "Everything in Growth, plus:",
    features: [
      "Unlimited multi-agent runs",
      "Dedicated CSM",
      "Slack support channel",
      { text: "Full self-driving Arya", soon: true },
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    badge: "bg-gray-900",
    desc: "For large organizations",
    monthly: null as number | null,
    yearly: null as number | null,
    credits: "Custom volume",
    replies: "Unlimited everything",
    includes: "Everything in Scale, plus:",
    features: [
      "Forward deployed implementation",
      "Campaign strategy session",
      "SSO/SAML",
      "Audit logs",
    ],
  },
];

export function ChangePlanModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { openCheckout } = useRazorpay();
  const { data: subscription } = useSubscription();
  const currentTier = subscription?.tier ?? null;

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrencyState] = useState<Currency>("INR");
  // Locked to INR when the user's Clerk profile has a +91 phone number.
  // Manual USD selection is refused with a "You are in India" toast.
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentsAvailable, setPaymentsAvailable] = useState<boolean | null>(null);

  // Extract the user's phone number(s) once — Clerk sometimes populates
  // primaryPhoneNumber, sometimes phoneNumbers[]; check both.
  const clerkPhones = useMemo(() => {
    const list: string[] = [];
    const primary = user?.primaryPhoneNumber?.phoneNumber;
    if (primary) list.push(primary);
    if (Array.isArray(user?.phoneNumbers)) {
      for (const p of user.phoneNumbers) {
        if (p?.phoneNumber && p.phoneNumber !== primary) list.push(p.phoneNumber);
      }
    }
    return list;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Server geo lock: IN → INR only, non-IN → USD only. Phone still
      // overrides geo when Clerk has a +91 number.
      const isIndia = await fetchGeoIsIndia();
      if (cancelled) return;
      const { currency: resolved, locked } = resolveCurrency({ phones: clerkPhones, isIndia });
      setCurrencyState(resolved);
      setCurrencyLocked(locked);
      writeStoredCurrency(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [clerkPhones]);

  const setCurrency = (next: Currency) => {
    if (currencyLocked) {
      toast.error(
        currency === "INR"
          ? "INR is required for payments from India."
          : "USD is required for payments outside India."
      );
      return;
    }
    setCurrencyState(next);
    writeStoredCurrency(next);
  };

  useEffect(() => {
    fetch("/api/billing/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setPaymentsAvailable(!!j?.paymentsAvailable))
      .catch(() => setPaymentsAvailable(false));
  }, []);

  async function handleUpgrade(planKey: string) {
    if (planKey === "enterprise") {
      window.location.href = "mailto:sales@aryasdr.in?subject=Enterprise%20plan%20inquiry";
      return;
    }
    if (paymentsAvailable === false) {
      toast.error("Payments aren't set up yet. Please contact support.");
      return;
    }

    const plan = PLANS.find((p) => p.key === planKey)!;
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, billing, currency }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.detail || data?.error || "Could not start payment. Please try again.");
        return;
      }

      const { orderId, amount, currency: orderCurrency, keyId } = await res.json();
      const isUsd = String(orderCurrency).toUpperCase() === "USD";
      const result = await openCheckout({
        orderId,
        amount,
        currency: orderCurrency,
        keyId,
        name: "AryaSDR",
        description: `${plan.name} plan, ${billing}`,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName ?? undefined,
        },
        // USD orders route through Razorpay's PayPal wallet only. INR orders
        // get the default checkout (UPI / Cards / NetBanking).
        paypalOnly: isUsd,
        verifyBody: { plan: planKey, billing, currency: orderCurrency },
        onVerified: () => {
          toast.success(`${plan.name} plan activated`);
          onClose();
          router.refresh();
        },
      });

      if (result.success === false && result.error && result.error !== "Cancelled by user") {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Change plan</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Currency + billing toggles */}
          <div className="flex flex-col items-center gap-3 mb-8">
            {/* Hidden entirely when geo-locked — user's location decides currency */}
            {!currencyLocked && (
              <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1">
                <button
                  onClick={() => setCurrency("INR")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    currency === "INR"
                      ? "bg-[#6C47FF] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  aria-pressed={currency === "INR"}
                >
                  <span aria-hidden>🇮🇳</span>
                  ₹ INR
                </button>
                <button
                  onClick={() => setCurrency("USD")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    currency === "USD"
                      ? "bg-[#6C47FF] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  aria-pressed={currency === "USD"}
                >
                  <span aria-hidden>🌍</span>
                  $ USD
                </button>
              </div>
            )}
            {currencyLocked && (
              <p className="text-[11px] text-violet-600 font-medium">
                {currency === "INR"
                  ? "🇮🇳 Prices shown in INR for payments from India."
                  : "🌍 Prices shown in USD for international payments."}
              </p>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billing === "monthly"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  billing === "yearly"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Yearly
                <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full">
                  Save 10%
                </span>
              </button>
            </div>

            {/* Payment method disclosure. For a +91 user the INR lock
                trumps everything — surface why the USD toggle is off. */}
            {currencyLocked ? (
              <p className="text-[11px] text-violet-600 text-center max-w-md font-medium">
                🇮🇳 You are in India. Payments are processed in INR via Razorpay (UPI / Cards / NetBanking).
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 text-center max-w-md">
                {currency === "USD"
                  ? "International payments are processed securely via PayPal. On the next screen, select PayPal from the payment options."
                  : "Indian payments via Razorpay: UPI / Cards / NetBanking."}
              </p>
            )}
          </div>

          {/* Plan cards — items-stretch on the grid + flex flex-col h-full on
              each card keeps them all the same height even when Enterprise's
              feature list is shorter. mt-auto on the CTA block pins it to
              the bottom of every card so the three CTAs align in a row. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {PLANS.map((plan) => {
              const isLoading = loadingPlan === plan.key;
              const priceLabel =
                plan.monthly != null && plan.monthly > 0
                  ? displayPrice(
                      billing === "monthly" ? plan.monthly : plan.yearly!,
                      currency
                    )
                  : null;
              // "Current Plan" detection — matched only for real paid tiers;
              // trial + free users still see the real upgrade buttons.
              const isCurrentPlan =
                currentTier === plan.key &&
                (plan.key === "starter" ||
                  plan.key === "growth" ||
                  plan.key === "scale" ||
                  plan.key === "enterprise");
              // Per-plan CTA color: Growth stays on the pink accent (matches
              // its "recommended" pink ring); Starter uses the violet brand
              // accent; Enterprise stays dark.
              const ctaColorClass =
                plan.key === "growth"
                  ? "bg-pink-500 text-white hover:bg-pink-600 shadow-sm"
                  : plan.key === "scale"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  : plan.key === "starter"
                  ? "bg-[#6C47FF] text-white hover:bg-[#5A38E0] shadow-sm"
                  : "bg-gray-900 text-white hover:bg-gray-800 shadow-sm";
              return (
                <div
                  key={plan.key}
                  className={`border rounded-xl p-5 relative flex flex-col h-full ${
                    plan.recommended
                      ? "border-pink-300 ring-1 ring-pink-200"
                      : "border-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-3 self-start ${plan.badge}`}
                  >
                    {plan.name}
                  </span>
                  <p className="text-xs text-gray-500 mb-3">{plan.desc}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-0.5">
                    {plan.monthly == null
                      ? "Custom"
                      : displayPrice(billing === "monthly" ? plan.monthly : plan.yearly!, currency)}
                    {plan.monthly != null && (
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    )}
                  </p>
                  {plan.monthly != null && plan.monthly > 0 && (
                    <p className="text-[11px] text-gray-400 mb-1">
                      ≈ {displayPrice(
                        billing === "monthly" ? plan.monthly : plan.yearly!,
                        currency === "USD" ? "INR" : "USD",
                      )}/mo
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-3">{plan.credits}</p>
                  <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                    <span className="text-gray-400">ℹ</span> {plan.replies}
                  </p>
                  <hr className="my-2 border-gray-100" />
                  <p className="text-xs font-medium text-gray-700 mb-2">{plan.includes}</p>
                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map((f, i) => {
                      const text = typeof f === "string" ? f : f.text;
                      const soon = typeof f !== "string" && f.soon;
                      return (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <Check className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                          <span className="flex-1">{text}</span>
                          {soon && (
                            <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded shrink-0">
                              Soon
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* CTA block — pushed to the bottom with mt-auto so it sits
                      at the same y-position across all three cards. Branches:
                        1. isCurrentPlan → disabled "Current Plan" chip.
                        2. Enterprise → Contact sales (dark).
                        3. USD + starter/growth → PayPal Smart Buttons via
                           @paypal/react-paypal-js. NEVER opens Razorpay.
                        4. INR + starter/growth → labeled button opens
                           Razorpay Checkout via handleUpgrade. */}
                  <div className="mt-auto">
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                      >
                        <Check className="h-4 w-4" />
                        Current Plan
                      </button>
                    ) : plan.key === "enterprise" ? (
                      <button
                        onClick={() => handleUpgrade(plan.key)}
                        disabled={!!loadingPlan}
                        className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] ${ctaColorClass}`}
                      >
                        Contact Sales
                      </button>
                    ) : currency === "USD" ? (
                      <PayPalCheckoutButton
                        purchase={{
                          plan: plan.key as "starter" | "growth" | "scale",
                          billing,
                        }}
                        buttonLabel={`Get ${plan.name}${priceLabel ? `: ${priceLabel}/mo` : ""}`}
                        colorClass={ctaColorClass}
                        onSuccess={() => {
                          onClose();
                          router.refresh();
                        }}
                        disabled={!isLoaded || !!loadingPlan}
                      />
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.key)}
                        disabled={!!loadingPlan || !isLoaded}
                        className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] ${ctaColorClass}`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing…
                          </>
                        ) : (
                          <>Get {plan.name}{priceLabel ? `: ${priceLabel}/mo` : ""}</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
