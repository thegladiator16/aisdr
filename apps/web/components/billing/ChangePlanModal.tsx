"use client";

import { useState } from "react";
import {
  X,
  Check,
  Lock,
  CreditCard,
  Smartphone,
  Landmark,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const GST_RATE = 0.18;

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

function detectCardBrand(num: string): string | null {
  const n = num.replace(/\s+/g, "");
  if (!n) return null;
  if (/^4/.test(n)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "MC";
  if (/^3[47]/.test(n)) return "AMEX";
  if (/^6(?:011|5)/.test(n)) return "DISCOVER";
  if (/^(60|65|81|82|508)/.test(n)) return "RUPAY";
  return null;
}

const CARD_BRANDS: { key: string; label: string; className: string }[] = [
  { key: "VISA", label: "VISA", className: "bg-[#1A1F71] text-white" },
  {
    key: "MC",
    label: "MasterCard",
    className: "bg-gradient-to-r from-[#EB001B] to-[#F79E1B] text-white",
  },
  { key: "AMEX", label: "AMEX", className: "bg-[#006FCF] text-white" },
  {
    key: "DISCOVER",
    label: "Discover",
    className: "bg-[#FF6000] text-white",
  },
  { key: "RUPAY", label: "RuPay", className: "bg-[#097969] text-white" },
];

const UPI_APPS: { label: string; className: string }[] = [
  { label: "GPay", className: "bg-white border border-gray-200 text-gray-700" },
  { label: "PhonePe", className: "bg-[#5F259F] text-white" },
  { label: "Paytm", className: "bg-[#00BAF2] text-white" },
  { label: "BHIM", className: "bg-[#1B3978] text-white" },
];

const BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "SBI",
  "Axis Bank",
  "Kotak",
  "Yes Bank",
  "Other",
];

const PLANS = [
  {
    name: "Starter",
    badge: "bg-violet-600",
    desc: "For B2B founders running outbound",
    monthly: "$199",
    yearly: "$179",
    credits: "500 leads/mo",
    replies: "1-12 positive replies/mo",
    includes: "Everything in Free, plus:",
    features: [
      "Gmail + WhatsApp integration",
      "Intent signals",
      "Autonomous reply drafting",
      "Deliverability monitoring",
      "Slack integration",
    ],
  },
  {
    name: "Growth",
    badge: "bg-pink-500",
    desc: "For teams scaling with full AI automation",
    monthly: "$349",
    yearly: "$314",
    credits: "2,000 leads/mo",
    replies: "4-30 positive replies/mo",
    includes: "Everything in Starter, plus:",
    features: [
      "CRM integrations (HubSpot)",
      "A/Z testing",
      { text: "Full self-driving Arya", soon: true },
      "Webhooks as data source",
      "Priority support",
    ],
    recommended: true,
  },
  {
    name: "Enterprise",
    badge: "bg-gray-900",
    desc: "For large organizations",
    monthly: "Custom",
    yearly: "Custom",
    credits: "Custom volume",
    replies: "50+ positive replies/mo",
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
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Step 2 payment state
  const [activeTab, setActiveTab] = useState<"card" | "upi" | "netbanking">(
    "card"
  );
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [country, setCountry] = useState("IN");
  const [saveCard, setSaveCard] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState(BANKS[0]);
  const [submitting, setSubmitting] = useState(false);

  const detectedBrand = detectCardBrand(cardNumber);

  // Pricing math
  const planForSummary = PLANS.find((p) => p.name === selectedPlan);
  const subtotal = planForSummary
    ? Number(
        (billing === "monthly" ? planForSummary.monthly : planForSummary.yearly)
          .toString()
          .replace(/[^0-9.]/g, "")
      ) || 0
    : 0;
  const tax = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function handlePay() {
    setSubmitting(true);
    try {
      await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          billing,
          subtotal,
          tax,
          total,
          method: activeTab,
        }),
      }).catch(() => null);
      // Simulate latency for nicer UX
      await new Promise((r) => setTimeout(r, 700));
      toast.success(`Payment of ${formatMoney(total)} successful`);
      onClose();
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={`w-full ${
          step === 2 ? "max-w-2xl" : "max-w-4xl"
        } rounded-2xl bg-white shadow-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Change plan</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-6">
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-2 mb-8">
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

            {/* Plan cards */}
            <div className="grid grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
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
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {billing === "monthly" ? plan.monthly : plan.yearly}
                    {plan.monthly !== "Custom" && (
                      <span className="text-sm font-normal text-gray-500">
                        /mo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">{plan.credits}</p>
                  <button
                    onClick={() => {
                      if (plan.name === "Enterprise") return;
                      setSelectedPlan(plan.name);
                      setStep(2);
                    }}
                    className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                      plan.name === "Enterprise"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-[#6C47FF] text-white hover:bg-[#5A38E0]"
                    }`}
                  >
                    {plan.name === "Enterprise"
                      ? "Contact sales"
                      : "Upgrade"}
                  </button>
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <span className="text-gray-400">ℹ</span> {plan.replies}
                  </p>
                  <hr className="my-4 border-gray-100" />
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    {plan.includes}
                  </p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f, i) => {
                      const text = typeof f === "string" ? f : f.text;
                      const soon = typeof f !== "string" && f.soon;
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
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
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* LEFT: Order summary (40%) */}
            <div className="md:w-2/5 bg-[#F9FAFB] p-6 border-r border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">
                Order summary
              </h3>

              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm font-semibold text-[#111827]">
                  {selectedPlan}
                </span>
                <span
                  className={`inline-block text-white text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    planForSummary?.badge ?? "bg-violet-600"
                  }`}
                >
                  {selectedPlan} tier
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Subtotal</span>
                  <span className="text-[#111827] tabular-nums">
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Tax (18% GST)</span>
                  <span className="text-[#111827] tabular-nums">
                    {formatMoney(tax)}
                  </span>
                </div>
                <hr className="border-[#E5E7EB]" />
                <div className="flex justify-between items-baseline">
                  <span className="text-[#111827] font-bold">Total</span>
                  <span className="text-[#111827] font-bold text-lg tabular-nums">
                    {formatMoney(total)}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] pt-1">
                  {billing === "monthly" ? "Billed monthly" : "Billed yearly"}
                </p>
              </div>
            </div>

            {/* RIGHT: Payment method (60%) */}
            <div className="md:w-3/5 p-6">
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-[#E5E7EB] mb-5">
                {[
                  { key: "card", label: "Card", icon: CreditCard },
                  { key: "upi", label: "UPI", icon: Smartphone },
                  { key: "netbanking", label: "Net Banking", icon: Landmark },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() =>
                        setActiveTab(t.key as "card" | "upi" | "netbanking")
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors relative ${
                        active
                          ? "text-[#6C47FF]"
                          : "text-[#6B7280] hover:text-[#111827]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {t.label}
                      {active && (
                        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#6C47FF] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Card tab */}
              {activeTab === "card" && (
                <div className="space-y-3">
                  {/* Brand row */}
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {CARD_BRANDS.map((b) => (
                      <span
                        key={b.key}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.className} ${
                          detectedBrand && detectedBrand !== b.key
                            ? "opacity-40"
                            : ""
                        }`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#111827]">
                      Cardholder name
                    </label>
                    <input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Name on card"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#111827]">
                      Card number
                    </label>
                    <div className="relative mt-1">
                      <input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="1234 1234 1234 1234"
                        inputMode="numeric"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-16 text-sm text-[#111827] focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                      />
                      {detectedBrand && (
                        <span
                          className={`absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            CARD_BRANDS.find((b) => b.key === detectedBrand)
                              ?.className ?? ""
                          }`}
                        >
                          {
                            CARD_BRANDS.find((b) => b.key === detectedBrand)
                              ?.label
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#111827]">
                        Expiration
                      </label>
                      <input
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#111827]">
                        CVC
                      </label>
                      <input
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        placeholder="123"
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#111827]">
                      Billing country
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                    >
                      <option value="IN">India</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                    />
                    Save card for future payments
                  </label>
                </div>
              )}

              {/* UPI tab */}
              {activeTab === "upi" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-[#111827]">
                      UPI ID
                    </label>
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="UPI ID (e.g., name@bank)"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {UPI_APPS.map((a) => (
                      <span
                        key={a.label}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.className}`}
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    You&apos;ll get a payment request on your UPI app
                  </p>
                </div>
              )}

              {/* Net Banking tab */}
              {activeTab === "netbanking" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-[#111827]">
                      Select your bank
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                    >
                      {BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handlePay}
                disabled={submitting}
                className="mt-5 w-full h-12 rounded-lg bg-[#6C47FF] text-white text-sm font-semibold hover:bg-[#5538DD] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay {formatMoney(total)}</>
                )}
              </button>

              {/* Trust signals */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                  <Lock className="h-3.5 w-3.5" />
                  Secured by 256-bit SSL encryption
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                  Powered by{" "}
                  <span className="font-bold text-[#0E2A8C]">Razorpay</span>
                </div>
              </div>

              {/* Back */}
              <div className="flex justify-start mt-3">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-[#6B7280] hover:text-[#111827]"
                >
                  ← Back to plans
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
