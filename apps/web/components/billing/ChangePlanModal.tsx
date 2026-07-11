"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  X,
  Check,
  Lock,
  CreditCard,
  Smartphone,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRazorpay } from "@/hooks/useRazorpay";

const GST_RATE = 0.18;

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/* ---------- card helpers ---------- */

function digits(s: string) {
  return s.replace(/\D/g, "");
}

function formatCardNumber(v: string) {
  const d = digits(v).slice(0, 19);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const d = digits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

function detectCardBrand(num: string): string | null {
  const n = digits(num);
  if (!n) return null;
  if (/^4/.test(n)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "MC";
  if (/^3[47]/.test(n)) return "AMEX";
  if (/^6(?:011|5)/.test(n)) return "DISCOVER";
  if (/^(60|65|81|82|508)/.test(n)) return "RUPAY";
  return null;
}

function luhnValid(num: string): boolean {
  const n = digits(num);
  if (n.length < 12 || n.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i]!, 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function isValidExpiry(v: string): boolean {
  const d = digits(v);
  if (d.length !== 4) return false;
  const mm = parseInt(d.slice(0, 2), 10);
  const yy = parseInt(d.slice(2, 4), 10);
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (yy < currentYear) return false;
  if (yy === currentYear && mm < currentMonth) return false;
  return true;
}

function isValidCvc(v: string, brand: string | null): boolean {
  const d = digits(v);
  const expected = brand === "AMEX" ? 4 : 3;
  return d.length === expected;
}

const CARD_BRANDS: { key: string; label: string; className: string }[] = [
  { key: "VISA", label: "VISA", className: "bg-[#1A1F71] text-white" },
  {
    key: "MC",
    label: "MasterCard",
    className: "bg-gradient-to-r from-[#EB001B] to-[#F79E1B] text-white",
  },
  { key: "AMEX", label: "AMEX", className: "bg-[#006FCF] text-white" },
  { key: "RUPAY", label: "RuPay", className: "bg-[#097969] text-white" },
];

const UPI_APPS = [
  { name: "GPay", className: "bg-white border border-[#E5E7EB]" },
  { name: "PhonePe", className: "bg-[#5F259F] text-white" },
  { name: "Paytm", className: "bg-[#00BAF2] text-white" },
  { name: "BHIM", className: "bg-[#00A651] text-white" },
  { name: "Amazon Pay", className: "bg-[#232F3E] text-white" },
];

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    badge: "bg-violet-600",
    desc: "For B2B founders running outbound",
    monthly: 6799,
    yearly: 5999,
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
    key: "growth",
    name: "Growth",
    badge: "bg-pink-500",
    desc: "For teams scaling with full AI automation",
    monthly: 11599,
    yearly: 10399,
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
    key: "scale",
    name: "Enterprise",
    badge: "bg-gray-900",
    desc: "For large organizations",
    monthly: null as number | null,
    yearly: null as number | null,
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
  const router = useRouter();
  const { user } = useUser();
  const { openCheckout } = useRazorpay();

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  // Payment state
  const [activeTab, setActiveTab] = useState<"card" | "upi">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Blur-triggered errors so we don't shout while the user is still typing
  const [touched, setTouched] = useState({
    cardName: false,
    cardNumber: false,
    expiry: false,
    cvc: false,
  });

  const detectedBrand = detectCardBrand(cardNumber);
  const cardNumberValid = luhnValid(cardNumber);
  const expiryValid = isValidExpiry(expiry);
  const cvcValid = isValidCvc(cvc, detectedBrand);
  const cardNameValid = cardName.trim().length >= 2;

  const cardFormValid =
    cardNameValid && cardNumberValid && expiryValid && cvcValid;

  const selectedPlan = useMemo(
    () => PLANS.find((p) => p.key === selectedPlanKey) ?? null,
    [selectedPlanKey]
  );

  // selectedPlan.yearly is the PER-MONTH equivalent price when billed
  // annually (e.g. "₹5,999/mo billed yearly") — matches how it's displayed
  // on the plan-selection card. The actual charge for yearly billing is 12x
  // that, matching lib/payments/razorpay.ts's PLAN_PRICES_INR.yearly (which
  // is literally `pricePerMonth * 12`). This was previously missing here,
  // showing e.g. "Pay ₹17,699" while Razorpay's checkout actually demanded
  // ~₹212,382 (12x more) — a real billing/trust bug, not just cosmetic.
  const subtotal = selectedPlan
    ? billing === "monthly"
      ? selectedPlan.monthly ?? 0
      : (selectedPlan.yearly ?? 0) * 12
    : 0;
  const tax = Math.round(subtotal * GST_RATE);
  const total = subtotal + tax;

  async function handlePay() {
    if (activeTab === "card" && !cardFormValid) {
      setTouched({ cardName: true, cardNumber: true, expiry: true, cvc: true });
      toast.error("Please fix the card details before proceeding");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlanKey, billing }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.detail || data?.error || "Could not start payment. Please try again.";
        toast.error(msg);
        return;
      }

      const { orderId, amount, currency, keyId } = await res.json();
      const result = await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        name: "AryaSDR",
        description: `${selectedPlan?.name} plan — ${billing}`,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName ?? undefined,
        },
        verifyBody: { plan: selectedPlanKey, billing },
        preferredMethod: activeTab,
        onVerified: () => {
          toast.success(`${selectedPlan?.name} plan activated`);
          onClose();
          router.refresh();
        },
      });
      if (result.success === false && result.error && result.error !== "Cancelled by user") {
        toast.error(result.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      toast.error(msg);
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
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
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
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {plan.monthly == null
                      ? "Custom"
                      : formatINR(billing === "monthly" ? plan.monthly : plan.yearly!)}
                    {plan.monthly != null && (
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">{plan.credits}</p>
                  <button
                    onClick={() => {
                      if (plan.key === "scale") {
                        window.location.href = "mailto:sales@aryasdr.in?subject=Enterprise%20plan%20inquiry";
                        return;
                      }
                      setSelectedPlanKey(plan.key);
                      setStep(2);
                    }}
                    className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                      plan.key === "scale"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-[#6C47FF] text-white hover:bg-[#5A38E0]"
                    }`}
                  >
                    {plan.key === "scale" ? "Contact sales" : "Upgrade"}
                  </button>
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <span className="text-gray-400">ℹ</span> {plan.replies}
                  </p>
                  <hr className="my-4 border-gray-100" />
                  <p className="text-xs font-medium text-gray-700 mb-2">{plan.includes}</p>
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
            {/* LEFT: Order summary */}
            <div className="md:w-2/5 bg-[#F9FAFB] p-6 border-r border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">Order summary</h3>

              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm font-semibold text-[#111827]">
                  {selectedPlan?.name}
                </span>
                <span
                  className={`inline-block text-white text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedPlan?.badge ?? "bg-violet-600"
                  }`}
                >
                  {selectedPlan?.name} tier
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Subtotal</span>
                  <span className="text-[#111827] tabular-nums">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">GST (18%)</span>
                  <span className="text-[#111827] tabular-nums">{formatINR(tax)}</span>
                </div>
                <hr className="border-[#E5E7EB]" />
                <div className="flex justify-between items-baseline">
                  <span className="text-[#111827] font-bold">Total</span>
                  <span className="text-[#111827] font-bold text-lg tabular-nums">
                    {formatINR(total)}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] pt-1">
                  {billing === "monthly" ? "Billed monthly" : "Billed yearly"}
                </p>
              </div>
            </div>

            {/* RIGHT: Payment method */}
            <div className="md:w-3/5 p-6">
              {/* Payment method tabs — the selection is passed through to
                  Razorpay Checkout via config.display.blocks so the modal
                  opens with the user's preferred method surfaced first */}
              <div className="flex items-center gap-1 border-b border-[#E5E7EB] mb-5">
                {[
                  { key: "card", label: "Card", icon: CreditCard },
                  { key: "upi", label: "UPI", icon: Smartphone },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key as "card" | "upi")}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors relative ${
                        active ? "text-[#6C47FF]" : "text-[#6B7280] hover:text-[#111827]"
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
                  {/* Brand chips */}
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {CARD_BRANDS.map((b) => (
                      <span
                        key={b.key}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.className} ${
                          detectedBrand && detectedBrand !== b.key ? "opacity-30" : ""
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
                      onBlur={() => setTouched((t) => ({ ...t, cardName: true }))}
                      placeholder="Name on card"
                      className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-[#111827] focus:ring-1 outline-none ${
                        touched.cardName && !cardNameValid
                          ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                          : "border-gray-200 focus:border-[#6C47FF] focus:ring-[#6C47FF]"
                      }`}
                    />
                    {touched.cardName && !cardNameValid && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" /> Enter the name as printed on your card
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#111827]">Card number</label>
                    <div className="relative mt-1">
                      <input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        onBlur={() => setTouched((t) => ({ ...t, cardNumber: true }))}
                        placeholder="1234 1234 1234 1234"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        className={`w-full rounded-lg border px-3 py-2.5 pr-24 text-sm text-[#111827] focus:ring-1 outline-none ${
                          touched.cardNumber && cardNumber && !cardNumberValid
                            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                            : "border-gray-200 focus:border-[#6C47FF] focus:ring-[#6C47FF]"
                        }`}
                      />
                      {detectedBrand && (
                        <span
                          className={`absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            CARD_BRANDS.find((b) => b.key === detectedBrand)?.className ?? ""
                          }`}
                        >
                          {CARD_BRANDS.find((b) => b.key === detectedBrand)?.label}
                        </span>
                      )}
                    </div>
                    {touched.cardNumber && cardNumber && !cardNumberValid && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" /> Invalid card number
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#111827]">Expiry</label>
                      <input
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        onBlur={() => setTouched((t) => ({ ...t, expiry: true }))}
                        placeholder="MM / YY"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-[#111827] focus:ring-1 outline-none ${
                          touched.expiry && expiry && !expiryValid
                            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                            : "border-gray-200 focus:border-[#6C47FF] focus:ring-[#6C47FF]"
                        }`}
                      />
                      {touched.expiry && expiry && !expiryValid && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" /> Invalid expiry
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#111827]">CVC</label>
                      <input
                        value={cvc}
                        onChange={(e) => setCvc(digits(e.target.value).slice(0, 4))}
                        onBlur={() => setTouched((t) => ({ ...t, cvc: true }))}
                        placeholder={detectedBrand === "AMEX" ? "1234" : "123"}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm text-[#111827] focus:ring-1 outline-none ${
                          touched.cvc && cvc && !cvcValid
                            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                            : "border-gray-200 focus:border-[#6C47FF] focus:ring-[#6C47FF]"
                        }`}
                      />
                      {touched.cvc && cvc && !cvcValid && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" />{" "}
                          {detectedBrand === "AMEX" ? "4 digits" : "3 digits"}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#6B7280] flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> All Indian cards supported —
                    Razorpay processes payments securely.
                  </p>
                </div>
              )}

              {/* UPI tab — user picks UPI here, and Razorpay Checkout opens
                  with UPI (Collect / Intent / QR) surfaced first. Actual
                  UPI ID capture happens inside Razorpay's PCI-compliant
                  checkout, not in our modal. */}
              {activeTab === "upi" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-white border border-[#E5E7EB] p-2 shrink-0">
                        <Smartphone className="h-5 w-5 text-[#6C47FF]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">Pay by UPI</p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          Enter your UPI ID, scan a QR code, or approve the request
                          directly in your UPI app. Razorpay handles the whole flow
                          securely.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#111827] mb-2">
                      Works with every major UPI app
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {UPI_APPS.map((app) => (
                        <span
                          key={app.name}
                          className={`px-2 py-1 rounded text-[11px] font-semibold ${app.className}`}
                        >
                          {app.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[#6B7280] flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> UPI PIN is entered on your bank&apos;s
                    secure screen — never on ours.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handlePay}
                disabled={submitting || (activeTab === "card" && !cardFormValid)}
                className="mt-5 w-full h-12 rounded-lg bg-[#6C47FF] text-white text-sm font-semibold hover:bg-[#5538DD] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>Pay {formatINR(total)}</>
                )}
              </button>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                  <Lock className="h-3.5 w-3.5" />
                  Secured by 256-bit SSL encryption
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                  Powered by <span className="font-bold text-[#0E2A8C]">Razorpay</span>
                </div>
              </div>

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
