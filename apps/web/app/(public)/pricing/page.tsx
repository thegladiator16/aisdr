"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { CreditEstimator } from "@/components/pricing/CreditEstimator";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "₹0",
    period: "/month",
    desc: "No credit card needed",
    features: [
      "50 leads/month",
      "100 emails/month",
      "Gmail integration",
      "Basic analytics",
    ],
    cta: "Start free",
    href: "/sign-up",
    recommended: false,
  },
  {
    key: "starter",
    name: "Starter",
    price: "₹15,000",
    period: "/month",
    desc: "Run outbound campaigns",
    features: [
      "500 leads/month",
      "2,000 emails/month",
      "WhatsApp integration",
      "Gmail integration",
      "Intent signals",
      "Autonomous reply drafting",
      "Deliverability monitoring",
    ],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=starter",
    recommended: false,
  },
  {
    key: "growth",
    name: "Growth",
    price: "₹30,000",
    period: "/month",
    desc: "Automate your full outbound motion",
    features: [
      "2,000 leads/month",
      "10,000 emails/month",
      "Everything in Starter",
      "CRM integrations",
      "A/Z testing",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=growth",
    recommended: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Unlimited scale",
    features: [
      "Unlimited leads & emails",
      "Dedicated CSM",
      "Slack channel",
      "SSO/SAML",
      "Audit logs",
    ],
    cta: "Book a demo",
    href: "/contact",
    recommended: false,
  },
];

const FAQ = [
  { q: "Can I try before buying?", a: "Yes! The free plan includes 50 leads and 100 emails per month, forever. No credit card needed." },
  { q: "How does billing work?", a: "Monthly billing via Razorpay. Cancel anytime, no contracts. Enterprise plans have annual options." },
  { q: "Can I switch plans?", a: "Yes. Upgrade or downgrade at any time. Changes take effect on your next billing cycle." },
  { q: "What payment methods do you accept?", a: "UPI, credit cards, debit cards, net banking, and wallets via Razorpay. Enterprise can pay via invoice." },
  { q: "Is there a refund policy?", a: "We offer a 14-day money-back guarantee on all paid plans. No questions asked." },
  { q: "Do unused credits roll over?", a: "Credits reset monthly. We recommend choosing a plan that fits your consistent volume." },
];

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("growth");

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <AryaAvatar size="sm" />
            <span className="font-bold text-gray-900 text-lg">AI SDR</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
            >
              Start free trial <ArrowRight className="inline h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold">Hire Arya</h1>
        <p className="text-lg text-gray-500 mt-3">
          Pay a fraction of a human SDR. Start for free.
        </p>
      </section>

      {/* Cost Comparison */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="rounded-2xl bg-white border border-gray-200 p-8 flex-1 max-w-xs text-center shadow-sm">
            <p className="text-sm text-gray-500 mb-2">A human SDR</p>
            <p className="text-4xl font-bold text-red-500">{"₹"}80,000</p>
            <p className="text-sm text-gray-400 mt-1">/month</p>
          </div>
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#6C47FF] text-white font-bold text-sm shrink-0">
            vs
          </div>
          <div className="rounded-2xl bg-white border-2 border-[#6C47FF] p-8 flex-1 max-w-xs text-center shadow-lg">
            <p className="text-sm text-[#6C47FF] mb-2 font-medium">Arya</p>
            <p className="text-4xl font-bold text-[#6C47FF]">{"₹"}15,000</p>
            <p className="text-sm text-gray-400 mt-1">/month</p>
            <p className="text-sm text-emerald-600 font-semibold mt-3">Save {"₹"}65,000/month</p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(({ key, name, price, period, desc, features, cta, href, recommended }) => (
            <div
              key={key}
              onClick={() => setSelectedPlan(key)}
              className={`relative rounded-2xl border-2 p-6 flex flex-col cursor-pointer transition-all duration-200 bg-white shadow-sm ${
                selectedPlan === key
                  ? "border-[#6C47FF] ring-2 ring-[#6C47FF] ring-offset-2 bg-[#F5F3FF]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#6C47FF] px-3 py-0.5 text-xs font-semibold text-white">
                  Recommended
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-900">{name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-3xl font-bold text-gray-900">{price}</span>
                <span className="text-gray-400 text-sm">{period}</span>
              </div>
              <p className="text-sm text-gray-500 mb-5">{desc}</p>
              <ul className="space-y-2 flex-1 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-[#6C47FF] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-center transition-colors ${
                  selectedPlan === key
                    ? "bg-[#6C47FF] text-white hover:bg-[#5538DD]"
                    : "bg-white text-[#6C47FF] border border-[#6C47FF] hover:bg-[#F5F3FF]"
                }`}
              >
                {cta} <ArrowRight className="inline h-3 w-3 ml-1" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Credit Estimator */}
      <section className="bg-gray-50 border-y border-gray-200 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center mb-8">
          <h2 className="text-2xl font-bold">Not sure which plan?</h2>
          <p className="text-gray-500 mt-2">Estimate your monthly credits</p>
        </div>
        <CreditEstimator />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="rounded-xl border border-gray-200 bg-white p-5 group">
              <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
                {q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
              </summary>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 bg-white">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <AryaAvatar size="sm" />
            <span className="text-sm font-semibold">AI SDR</span>
          </Link>
          <p className="text-xs text-gray-400">&copy; 2026 AI SDR. GDPR & India DPDPA compliant.</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
