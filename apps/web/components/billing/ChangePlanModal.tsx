"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRazorpay } from "@/hooks/useRazorpay";
import {
  resolveCurrency,
  isIndianByPhone,
  writeStoredCurrency,
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
    monthly: 4999,
    yearly: 4166,
    credits: "5,000 credits/mo",
    replies: "500 leads in database",
    includes: "Everything in Free, plus:",
    features: [
      "5 active campaigns",
      "Gmail integration",
      "Basic sequences",
      "Intent signals",
      "Autonomous reply drafting",
      "Deliverability monitoring",
      "Email support",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    badge: "bg-pink-500",
    desc: "For teams scaling with full AI automation",
    monthly: 9999,
    yearly: 8333,
    credits: "15,000 credits/mo",
    replies: "5,000 leads in database",
    includes: "Everything in Starter, plus:",
    features: [
      "Unlimited campaigns",
      "All features unlocked",
      "A/Z testing",
      "Advanced analytics",
      "CRM integrations (HubSpot)",
      { text: "Full self-driving Arya", soon: true },
      "Priority support",
    ],
    recommended: true,
  },
  {
    key: "scale",
    name: "Enterprise",
    badge: "bg-gray-900",
    desc: "For large organizations",
    monthly: null as number | null,
    yearly: null as number | null,
    credits: "Custom volume",
    replies: "Unlimited everything",
    includes: "Everything in Growth, plus:",
    features: [
      "Forward deployed implementation",
      "Campaign strategy session",
      "Dedicated CSM + Slack channel",
      "SSO/SAML",
      "Audit logs",
    ],
  },
];

export function ChangePlanModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useUser();
  const { openCheckout } = useRazorpay();

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrencyState] = useState<Currency>("INR");
  // Locked to INR when the user's Clerk profile has a +91 phone number.
  // Manual USD selection is refused with a "You are in India" toast.
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentsAvailable, setPaymentsAvailable] = useState<boolean | null>(null);

  // Extract the user's phone number(s) once â€” Clerk sometimes populates
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
    // Priority: +91 phone â†’ INR (locked) > stored preference > browser locale.
    // If a +91 user had previously toggled to USD and localStorage remembers
    // it, we override that here and rewrite the preference back to INR.
    const { currency: resolved, locked } = resolveCurrency({ phones: clerkPhones });
    setCurrencyState(resolved);
    setCurrencyLocked(locked);
    if (locked) writeStoredCurrency("INR");
  }, [clerkPhones]);

  const setCurrency = (next: Currency) => {
    if (currencyLocked && next === "USD") {
      toast.error("You are in India. Please pay in INR.");
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
    if (planKey === "scale") {
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
        description: `${plan.name} plan â€” ${billing}`,
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
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1">
              <button
                onClick={() => setCurrency("INR")}
                disabled={currencyLocked && currency === "INR"}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currency === "INR"
                    ? "bg-[#6C47FF] text-white"
                    : "text-gray-600 hover:text-gray-900"
                } disabled:cursor-default`}
                aria-pressed={currency === "INR"}
              >
                <span aria-hidden>ðŸ‡®ðŸ‡³</span>
                â‚¹ INR
              </button>
              <button
                onClick={() => setCurrency("USD")}
                disabled={currencyLocked}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currency === "USD"
                    ? "bg-[#6C47FF] text-white"
                    : "text-gray-600 hover:text-gray-900"
                } ${currencyLocked ? "opacity-40 cursor-not-allowed" : ""}`}
                aria-pressed={currency === "USD"}
                aria-disabled={currencyLocked}
                title={currencyLocked ? "You are in India. Please pay in INR." : undefined}
              >
                <span aria-hidden>ðŸŒ</span>
                $ USD
              </button>
            </div>

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
                trumps everything â€” surface why the USD toggle is off. */}
            {currencyLocked ? (
              <p className="text-[11px] text-violet-600 text-center max-w-md font-medium">
                ðŸ‡®ðŸ‡³ You are in India. Payments are processed in INR via Razorpay (UPI / Cards / NetBanking).
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 text-center max-w-md">
                {currency === "USD"
                  ? "International payments are processed securely via PayPal. On the next screen, select PayPal from the payment options."
                  : "Indian payments via Razorpay â€” UPI / Cards / NetBanking."}
              </p>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isLoading = loadingPlan === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`border rounded-xl p-5 relative ${
                    plan.recommended
                      ? "border-pink-300 ring-1 ring-pink-200"
                      : "border-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${plan.badge}`}
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
                      â‰ˆ {displayPrice(
                        billing === "monthly" ? plan.monthly : plan.yearly!,
                        currency === "USD" ? "INR" : "USD",
                      )}/mo
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-4">{plan.credits}</p>
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={!!loadingPlan}
                    className={`w-full rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                      plan.key === "scale"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-[#6C47FF] text-white hover:bg-[#5A38E0]"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processingâ€¦
                      </>
                    ) : plan.key === "scale" ? (
                      "Contact sales"
                    ) : (
                      "Upgrade"
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <span className="text-gray-400">â„¹</span> {plan.replies}
                  </p>
                  <hr className="my-4 border-gray-100" />
                  <p className="text-xs font-medium text-gray-700 mb-2">{plan.includes}</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f, i) => {
                      const text = typeof f === "string" ? f : f.text;
                      const soon = typeof f !== "string" && f.soon;
                      return (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                          {text}
                          {soon && (
                            <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded">
                              Soon
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
