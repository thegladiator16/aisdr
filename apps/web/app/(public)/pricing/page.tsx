'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AryaAvatar } from "@/components/arya/AryaAvatar"
import { CreditEstimator } from "@/components/pricing/CreditEstimator"

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: '/month',
    description: 'No credit card needed',
    features: [
      '50 leads/month',
      '100 emails/month',
      'Gmail integration',
      'Basic analytics',
    ],
    cta: 'Start free',
    ctaHref: '/sign-up',
    recommended: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₹15,000',
    period: '/month',
    description: 'Run outbound campaigns',
    features: [
      '500 leads/month',
      '2,000 emails/month',
      'WhatsApp integration',
      'Gmail integration',
      'Intent signals',
      'Autonomous reply drafting',
      'Deliverability monitoring',
    ],
    cta: 'Start 14-day trial',
    ctaHref: '/sign-up?plan=starter',
    recommended: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₹30,000',
    period: '/month',
    description: 'Automate your full outbound motion',
    features: [
      '2,000 leads/month',
      '10,000 emails/month',
      'Everything in Starter',
      'CRM integrations',
      'A/Z testing',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    ctaHref: '/sign-up?plan=growth',
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Unlimited scale',
    features: [
      'Unlimited leads & emails',
      'Dedicated CSM',
      'Slack channel',
      'SSO/SAML',
      'Audit logs',
    ],
    cta: 'Book a demo',
    ctaHref: '/contact',
    recommended: false,
  },
]

const FAQ = [
  { q: "Can I try before buying?", a: "Yes! The free plan includes 50 leads and 100 emails per month, forever. No credit card needed." },
  { q: "How does billing work?", a: "Monthly billing via Razorpay. Cancel anytime, no contracts. Enterprise plans have annual options." },
  { q: "Can I switch plans?", a: "Yes. Upgrade or downgrade at any time. Changes take effect on your next billing cycle." },
  { q: "What payment methods do you accept?", a: "UPI, credit cards, debit cards, net banking, and wallets via Razorpay. Enterprise can pay via invoice." },
  { q: "Is there a refund policy?", a: "We offer a 14-day money-back guarantee on all paid plans. No questions asked." },
  { q: "Do unused credits roll over?", a: "Credits reset monthly. We recommend choosing a plan that fits your consistent volume." },
]

export default function PricingPage() {
  const [selected, setSelected] = useState<string>('growth')

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
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
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5538DD] transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Hire Arya</h1>
        <p className="text-lg text-gray-500 mt-3">
          Pay a fraction of a human SDR. Start for free.
        </p>
      </section>

      {/* Cost Comparison */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="rounded-2xl bg-white border border-gray-200 p-8 flex-1 max-w-xs text-center shadow-sm">
            <p className="text-sm text-gray-500 mb-2">A human SDR</p>
            <p className="text-4xl font-bold text-red-500">₹80,000</p>
            <p className="text-sm text-gray-400 mt-1">/month</p>
          </div>
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#6C47FF] text-white font-bold text-sm shrink-0">
            vs
          </div>
          <div className="rounded-2xl bg-white border-2 border-[#6C47FF] p-8 flex-1 max-w-xs text-center shadow-lg">
            <p className="text-sm text-[#6C47FF] mb-2 font-medium">Arya</p>
            <p className="text-4xl font-bold text-[#6C47FF]">₹15,000</p>
            <p className="text-sm text-gray-400 mt-1">/month</p>
            <p className="text-sm text-emerald-600 font-semibold mt-3">Save ₹65,000/month</p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isSelected = selected === plan.id
            return (
              <div
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`
                  relative bg-white rounded-2xl p-6 flex flex-col cursor-pointer
                  transition-all duration-200 ease-in-out
                  ${isSelected
                    ? 'border-2 border-[#6C47FF] shadow-lg ring-2 ring-[#6C47FF] ring-offset-2'
                    : 'border-2 border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#6C47FF] text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
                      Recommended
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
                </div>

                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-[#6C47FF] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  onClick={(e) => e.stopPropagation()}
                  className={`
                    block w-full text-center py-3 px-4 rounded-xl text-sm font-semibold transition-colors
                    ${isSelected
                      ? 'bg-[#6C47FF] text-white hover:bg-[#5538DD]'
                      : 'bg-white text-[#6C47FF] border-2 border-[#6C47FF] hover:bg-[#F5F3FF]'
                    }
                  `}
                >
                  {plan.cta} →
                </Link>
              </div>
            )
          })}
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
  )
}
