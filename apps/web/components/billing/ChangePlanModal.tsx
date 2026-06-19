"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    badge: "bg-violet-600",
    desc: "For B2B founders running outbound",
    monthly: "$179",
    yearly: "$161",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2">
            {/* Order summary */}
            <div className="p-6 border-r border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Order summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span>
                    Free → <span className="font-medium">{selectedPlan}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Credits</span>
                  <span>
                    50/mo →{" "}
                    <span className="font-medium">
                      {selectedPlan === "Starter" ? "500/mo" : "2,000/mo"}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price</span>
                  <span>
                    $0/mo →{" "}
                    <span className="font-medium">
                      {selectedPlan === "Starter" ? "$179/mo" : "$349/mo"}
                    </span>
                  </span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan credits</span>
                  <span className="font-medium">
                    {selectedPlan === "Starter" ? "$179" : "$349"}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Due today</span>
                  <span>
                    {selectedPlan === "Starter" ? "$179" : "$349"}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Payment method
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Card number
                  </label>
                  <input
                    placeholder="1234 1234 1234 1234"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Expiration date
                    </label>
                    <input
                      placeholder="MM / YY"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">
                      Security code
                    </label>
                    <input
                      placeholder="CVC"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Country
                  </label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none">
                    <option>India</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                  </select>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  By providing your card information, you allow AryaSDR to
                  charge your card for future payments in accordance with their
                  terms.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                  This will update your default payment method. This can be
                  changed at any time in Billing page.
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]">
                  Confirm upgrade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
