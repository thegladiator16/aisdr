'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Zap } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { AryaAvatar } from "@/components/arya/AryaAvatar"
import { ROICalculator } from "@/components/pricing/ROICalculator"
import {
  resolveCurrency,
  writeStoredCurrency,
  fetchGeoIsIndia,
  formatMoney,
  inrToUsdDisplay,
  type Currency,
} from '@/lib/payments/currency'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

/**
 * Convert an INR whole-rupee display price to the current-currency display.
 * Server actually charges the values in `PLAN_PRICES_USD` — this helper is
 * only for the pricing-card display and stays in lockstep with those via
 * the fixed INR_PER_USD rate in `lib/payments/razorpay.ts`.
 */
function displayPrice(inrAmount: number, currency: Currency): string {
  if (inrAmount === 0) return formatMoney(0, currency)
  const value = currency === 'USD' ? inrToUsdDisplay(inrAmount) : inrAmount
  return formatMoney(value, currency)
}

const PLANS = [
  {
    id: 'free',
    name: 'Free Trial',
    monthly: 0,
    yearly: 0,
    creditLabel: '10,000 credits',
    leadsLabel: '14 days, all features',
    description: 'Explore the full platform free for 14 days.',
    cta: 'Start free →',
    ctaHref: '/sign-up',
    highlight: false,
    badge: null as string | null,
    features: {
      campaigns: true,
      emails: true,
      sequences: true,
      credits: '10,000 (14 days)',
      leads: 'All features',
      activeCampaigns: 'Unlimited',
      multiAgentRuns: 'Unlimited',
      support: 'Community',
      azTesting: true,
      analytics: 'Basic',
      integrations: 'Gmail',
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    monthly: 6999,
    yearly: 5833,
    creditLabel: '3,000 credits/month',
    leadsLabel: '100 leads in database',
    description: 'Run outbound campaigns with full email automation.',
    cta: 'Start free trial →',
    ctaHref: '/sign-up?plan=starter',
    highlight: false,
    badge: null as string | null,
    features: {
      campaigns: true,
      emails: true,
      sequences: true,
      credits: '3,000 / month',
      leads: '100',
      activeCampaigns: '3',
      multiAgentRuns: '5 / month',
      support: 'Email',
      azTesting: false,
      analytics: 'Basic',
      integrations: 'Gmail',
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 12999,
    yearly: 10833,
    creditLabel: '8,000 credits/month',
    leadsLabel: '500 leads in database',
    description: 'Automate your entire outbound motion at scale.',
    cta: 'Start free trial →',
    ctaHref: '/sign-up?plan=growth',
    highlight: true,
    badge: 'Most Popular',
    features: {
      campaigns: true,
      emails: true,
      sequences: true,
      credits: '8,000 / month',
      leads: '500',
      activeCampaigns: 'Unlimited',
      multiAgentRuns: '25 / month',
      support: 'Priority',
      azTesting: true,
      analytics: 'Advanced',
      integrations: 'Gmail + Apollo.io',
    },
  },
  {
    id: 'scale',
    name: 'Scale',
    monthly: 24999,
    yearly: 20833,
    creditLabel: '20,000 credits/month',
    leadsLabel: '2,000 leads in database',
    description: 'Full power at a fraction of Artisan\'s $600+/mo.',
    cta: 'Start free trial →',
    ctaHref: '/sign-up?plan=scale',
    highlight: false,
    badge: 'Best Value vs Artisan',
    features: {
      campaigns: true,
      emails: true,
      sequences: true,
      credits: '20,000 / month',
      leads: '2,000',
      activeCampaigns: 'Unlimited',
      multiAgentRuns: 'Unlimited',
      support: 'Dedicated CSM + Slack',
      azTesting: true,
      analytics: 'Advanced',
      integrations: 'All integrations',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: null,
    yearly: null,
    creditLabel: 'Custom volume',
    leadsLabel: 'Unlimited',
    description: 'Dedicated implementation, SLAs, and custom contracts.',
    cta: 'Contact sales →',
    ctaHref: 'mailto:sales@aryasdr.in?subject=Enterprise%20plan%20inquiry',
    highlight: false,
    badge: null as string | null,
    features: {
      campaigns: true,
      emails: true,
      sequences: true,
      credits: 'Custom',
      leads: 'Unlimited',
      activeCampaigns: 'Unlimited',
      multiAgentRuns: 'Unlimited',
      support: 'Dedicated CSM',
      azTesting: true,
      analytics: 'Advanced + custom',
      integrations: 'All + SSO/SAML',
    },
  },
]

const COMPARISON_ROWS: {
  label: string
  key: keyof typeof PLANS[0]['features']
  isBool?: boolean
}[] = [
  { label: 'Credits / month', key: 'credits' },
  { label: 'Leads in database', key: 'leads' },
  { label: 'Active campaigns', key: 'activeCampaigns' },
  { label: 'Multi-agent runs', key: 'multiAgentRuns' },
  { label: 'Run campaigns & send emails', key: 'campaigns', isBool: true },
  { label: 'Email sequences', key: 'sequences', isBool: true },
  { label: 'A/Z testing', key: 'azTesting', isBool: true },
  { label: 'Analytics', key: 'analytics' },
  { label: 'Integrations', key: 'integrations' },
  { label: 'Support', key: 'support' },
]

const CREDIT_COSTS = [
  { action: 'Lead prospected (Hunter)', credits: 15, icon: '🔍' },
  { action: 'Lead prospected (Apollo)', credits: 20, icon: '🚀' },
  { action: 'Lead researched (Serper)', credits: 10, icon: '🔬' },
  { action: 'Email written', credits: 12, icon: '✍️' },
  { action: 'Email sent', credits: 25, icon: '✉️' },
  { action: 'Reply classification', credits: 8, icon: '📩' },
  { action: 'Meeting booking', credits: 20, icon: '📅' },
]

const FAQ = [
  {
    q: 'What happens when my free trial ends?',
    a: 'Your active campaigns are paused. You keep all your data and can upgrade to any paid plan at any time to resume.',
  },
  {
    q: 'What are credits?',
    a: 'Credits are consumed per agent action: prospecting a lead costs 15 credits, researching costs 10, writing an email costs 12, sending costs 25, reply classification costs 8, and booking a meeting costs 20. Unused credits carry over month-to-month.',
  },
  {
    q: 'What are multi-agent runs?',
    a: 'A multi-agent run is when Arya\'s AI agents work end-to-end autonomously — prospecting, researching, writing, and sending. Starter gets 5/month, Growth gets 25/month, and Scale gets unlimited.',
  },
  {
    q: 'How is AryaSDR different from Artisan?',
    a: 'AryaSDR offers the same AI SDR capabilities — autonomous prospecting, research, email writing, and sending — at a fraction of Artisan\'s $600+/month price. Our Scale plan at $294/mo gives you 20,000 credits and unlimited multi-agent runs.',
  },
  {
    q: 'How does billing work?',
    a: 'Monthly billing in INR via Razorpay or USD via PayPal. Yearly billing gives ~17% off. Cancel anytime — no lock-in, no contracts.',
  },
  {
    q: 'Do unused credits roll over?',
    a: "Yes — on monthly plans, unused credits carry over to the next month. They don't expire as long as your subscription is active.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Indian users: UPI, credit/debit cards, net banking via Razorpay. International users: PayPal.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

export default function PricingPage() {
  const { user } = useUser()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  // Start on INR (matches SSR) then hydrate from Clerk phone / localStorage /
  // browser locale in useEffect to avoid a hydration mismatch.
  const [currency, setCurrencyState] = useState<Currency>('INR')
  // Locked when the signed-in user's Clerk profile has a +91 phone. Public
  // visitors without a session never see the lock — locale detection alone
  // decides their default.
  const [currencyLocked, setCurrencyLocked] = useState(false)

  const clerkPhones = useMemo(() => {
    const list: string[] = []
    const primary = user?.primaryPhoneNumber?.phoneNumber
    if (primary) list.push(primary)
    if (Array.isArray(user?.phoneNumbers)) {
      for (const p of user.phoneNumbers) {
        if (p?.phoneNumber && p.phoneNumber !== primary) list.push(p.phoneNumber)
      }
    }
    return list
  }, [user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Server geo (Vercel edge) is the authoritative signal — INR for
      // India, USD for everyone else, no toggle in either direction.
      const isIndia = await fetchGeoIsIndia()
      if (cancelled) return
      const { currency: resolved, locked } = resolveCurrency({ phones: clerkPhones, isIndia })
      setCurrencyState(resolved)
      setCurrencyLocked(locked)
      writeStoredCurrency(resolved)
    })()
    return () => {
      cancelled = true
    }
  }, [clerkPhones])

  const setCurrency = (next: Currency) => {
    if (currencyLocked) {
      toast.error(
        currency === 'INR'
          ? 'INR is required for payments from India.'
          : 'USD is required for payments outside India.'
      )
      return
    }
    setCurrencyState(next)
    writeStoredCurrency(next)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <AryaAvatar size="sm" />
            <span className="font-bold text-gray-900 text-lg">AryaSDR</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">
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

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-5xl px-6 pt-16 pb-8 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <Zap className="h-3 w-3" />
          14-day free trial on all paid plans — no credit card required
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Pay a fraction of a human SDR. Arya does the prospecting, enrichment,
          outreach, and follow-up — all on autopilot.
        </p>

        {/* Currency + billing toggles */}
        <div className="flex flex-col items-center gap-3 mt-8">
          {/* Currency segmented control — hidden entirely when geo-locked */}
          {!currencyLocked && (
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm relative">
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="absolute top-1 bottom-1 rounded-full bg-[#6C47FF]"
                style={{
                  width: 'calc(50% - 4px)',
                  left: currency === 'INR' ? 4 : 'calc(50% + 0px)',
                }}
                aria-hidden
              />
              <button
                onClick={() => setCurrency('INR')}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currency === 'INR' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={currency === 'INR'}
              >
                <span aria-hidden>🇮🇳</span>
                ₹ INR
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currency === 'USD' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={currency === 'USD'}
              >
                <span aria-hidden>🌍</span>
                $ USD
              </button>
            </div>
          )}
          {currencyLocked && (
            <p className="text-[11px] text-violet-600 font-medium">
              {currency === 'INR'
                ? '🇮🇳 Prices shown in INR for payments from India.'
                : '🌍 Prices shown in USD for international payments.'}
            </p>
          )}

          {/* Billing cycle */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billing === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billing === 'yearly' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Yearly
              <AnimatePresence mode="wait">
                <motion.span
                  key={billing}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold"
                >
                  Save 17%
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.section>

      {/* Plan cards */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              whileHover={{ scale: 1.015, y: -6, transition: { duration: 0.2 } }}
              className={`relative bg-white rounded-2xl p-5 flex flex-col border-2 cursor-pointer ${
                plan.highlight
                  ? 'border-[#6C47FF] shadow-lg shadow-violet-100'
                  : plan.id === 'scale'
                  ? 'border-emerald-300 shadow-md shadow-emerald-50'
                  : 'border-gray-200 shadow-sm hover:shadow-md'
              }`}
              style={{ willChange: 'transform' }}
            >
              {(plan.highlight || plan.badge) && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap ${
                    plan.id === 'scale' ? 'bg-emerald-600' : 'bg-[#6C47FF]'
                  }`}>
                    {plan.badge ?? 'Most popular'}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
              </div>

              <div className="mb-4">
                {plan.monthly == null ? (
                  <p className="text-3xl font-bold text-gray-900">Custom</p>
                ) : plan.monthly === 0 ? (
                  <div>
                    <p className="text-3xl font-bold text-gray-900">Free</p>
                    <p className="text-xs text-gray-400 mt-0.5">14 days</p>
                  </div>
                ) : (
                  <div>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={billing + plan.id + currency}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="text-3xl font-bold text-gray-900"
                      >
                        {displayPrice(billing === 'monthly' ? plan.monthly : plan.yearly!, currency)}
                        <span className="text-base font-normal text-gray-400">/mo</span>
                      </motion.p>
                    </AnimatePresence>
                    {/* Secondary "≈ other currency" reference so users can double-
                        check the FX conversion at a glance. */}
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      ≈ {displayPrice(
                        billing === 'monthly' ? plan.monthly : plan.yearly!,
                        currency === 'USD' ? 'INR' : 'USD',
                      )}/month
                    </p>
                    {billing === 'yearly' && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-emerald-600 font-medium mt-1"
                      >
                        {displayPrice(plan.monthly - plan.yearly!, currency)} saved / month
                      </motion.p>
                    )}
                  </div>
                )}
                <p className="text-xs font-semibold text-violet-600 mt-2">{plan.creditLabel}</p>
                <p className="text-xs text-gray-400">{plan.leadsLabel}</p>
              </div>

              <Link
                href={plan.ctaHref}
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors mb-5 ${
                  plan.highlight
                    ? 'bg-[#6C47FF] text-white hover:bg-[#5538DD]'
                    : plan.id === 'scale'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : plan.id === 'enterprise'
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border-2 border-gray-200 text-gray-700 hover:border-[#6C47FF] hover:text-[#6C47FF]'
                }`}
              >
                {plan.cta}
              </Link>

              {/* Feature checkmarks — stagger reveal */}
              <ul className="space-y-2 flex-1">
                {COMPARISON_ROWS.filter((r) => r.isBool).map((row, ri) => {
                  const val = plan.features[row.key]
                  return (
                    <motion.li
                      key={row.key}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: ri * 0.07 }}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      {val ? (
                        <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                      )}
                      {row.label}
                    </motion.li>
                  )
                })}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Credit costs callout */}
      <section className="bg-white border-y border-gray-200 py-14">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900">How credits work</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Credits are consumed per action. Unused credits carry over month-to-month.
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {CREDIT_COSTS.map((c) => (
              <motion.div
                key={c.action}
                variants={fadeUp}
                whileHover={{ scale: 1.03, y: -3, transition: { duration: 0.2 } }}
                className="rounded-xl border border-gray-200 bg-[#FAFAFA] p-4 text-center cursor-default"
                style={{ willChange: 'transform' }}
              >
                <div className="text-3xl mb-3">{c.icon}</div>
                <p className="text-2xl font-bold text-[#6C47FF]">{c.credits}</p>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">credits</p>
                <p className="text-sm font-medium text-gray-700 mt-2">{c.action}</p>
              </motion.div>
            ))}
          </motion.div>
          <p className="text-center text-xs text-gray-400 mt-6">
            A Starter plan (3,000 credits) can prospect ~200 leads and send ~120 personalised emails per month.
          </p>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 text-center mb-8"
        >
          Full feature comparison
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">
                  Feature
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.id}
                    className={`text-center px-4 py-3.5 text-sm font-bold ${
                      p.highlight ? 'text-[#6C47FF]' : 'text-gray-900'
                    }`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={row.key} className={idx % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="px-5 py-3 text-xs font-medium text-gray-600">
                    {row.label}
                  </td>
                  {PLANS.map((plan) => {
                    const val = plan.features[row.key]
                    return (
                      <td key={plan.id} className="text-center px-4 py-3">
                        {row.isBool ? (
                          val ? (
                            <Check className="h-4 w-4 text-violet-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-xs text-gray-700">{String(val)}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* Cost comparison — Why AryaSDR over Artisan? */}
      <section className="bg-gradient-to-br from-violet-50 to-pink-50 border-y border-gray-100 py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl px-6 text-center mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900">Why AryaSDR over Artisan?</h2>
          <p className="text-gray-500 text-sm mt-2">
            Same AI SDR capabilities. A fraction of the cost.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl grid grid-cols-3 gap-4 px-6"
        >
          <div className="bg-white border-2 border-red-300 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs text-red-400 font-semibold mb-2">Human SDR</p>
            <p className="text-2xl font-bold text-red-500">{displayPrice(80000, currency)}</p>
            <p className="text-xs text-gray-400 mt-1">/month</p>
          </div>
          <div className="bg-white border-2 border-orange-300 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs text-orange-500 font-semibold mb-2">Artisan</p>
            <p className="text-2xl font-bold text-orange-500">{displayPrice(51000, currency)}</p>
            <p className="text-xs text-gray-400 mt-1">/month (starts at)</p>
          </div>
          <div className="bg-white border-2 border-[#6C47FF] rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs text-[#6C47FF] font-semibold mb-2">AryaSDR Scale</p>
            <p className="text-2xl font-bold text-[#6C47FF]">{displayPrice(24999, currency)}</p>
            <p className="text-xs text-gray-400 mt-1">/month</p>
            <p className="text-xs text-emerald-600 font-bold mt-2">
              Save {displayPrice(26000, currency)}/mo vs Artisan
            </p>
          </div>
        </motion.div>

        <p className="mx-auto max-w-3xl px-6 pt-8 text-center text-xs text-gray-400">
          * International payments via PayPal. Indian payments via Razorpay (UPI / Cards / NetBanking / Wallets).
        </p>
      </section>

      {/* ROI Calculator */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <ROICalculator />
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-center mb-10 text-gray-900"
        >
          Frequently asked questions
        </motion.h2>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="space-y-3"
        >
          {FAQ.map(({ q, a }) => (
            <motion.details key={q} variants={fadeUp} className="rounded-xl border border-gray-200 bg-white p-5 group">
              <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between text-sm">
                {q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl leading-none ml-3">
                  +
                </span>
              </summary>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{a}</p>
            </motion.details>
          ))}
        </motion.div>
      </section>

      {/* CTA footer banner */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-[#6C47FF] py-12 text-center text-white"
      >
        <h2 className="text-2xl font-bold mb-2">Start your 14-day free trial</h2>
        <p className="text-violet-200 text-sm mb-6">
          10,000 credits. All features. No credit card required.
        </p>
        <Link
          href="/sign-up"
          className="inline-block bg-white text-[#6C47FF] font-bold px-8 py-3 rounded-xl hover:bg-violet-50 transition-colors animate-cta-glow"
        >
          Get started free →
        </Link>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 bg-white">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <AryaAvatar size="sm" />
            <span className="text-sm font-semibold text-gray-900">AryaSDR</span>
          </Link>
          <p className="text-xs text-gray-400">&copy; 2026 AryaSDR. GDPR &amp; India DPDPA compliant.</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
