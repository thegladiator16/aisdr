"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { LazyMotion, m, useInView, useSpring, useMotionValueEvent, useReducedMotion } from "framer-motion"
import {
  CheckCircle2, ArrowRight, Mail, MessageCircle, Star, Users, Target, Sparkles,
  Linkedin, MessageSquare, Phone, Volume2, Calendar, BarChart3, Database, PenLine,
  Zap, Twitter, Youtube, Send,
} from "lucide-react"
import { AryaAvatar } from "@/components/arya/AryaAvatar"
import { Navbar } from "@/components/layout/Navbar"

// Split Framer Motion features into an async chunk — keeps the initial JS bundle small
const loadFeatures = () => import("framer-motion").then(mod => mod.domAnimation)

const STEPS = [
  {
    num: "01",
    title: "She finds and prioritizes high-intent leads",
    desc: "Search 250M+ verified B2B contacts or import your list. Arya enriches each prospect using 15+ data sources, then prioritizes by intent signals like funding rounds and new hires.",
    checks: ["Enriched from 15 sources", "Funding signal detected", "Decision maker verified", "Email verified"],
  },
  {
    num: "02",
    title: "She writes hyper-personalized outreach",
    desc: "Arya reads your prospect's LinkedIn, company website, and recent news to write emails that feel hand-crafted. Available in English and Hinglish.",
    checks: ["LinkedIn research", "Company analysis", "News context", "Hinglish support"],
  },
  {
    num: "03",
    title: "She sends across Email AND WhatsApp",
    desc: "Unlike global tools, Arya supports WhatsApp Business API, the channel where Indian founders actually respond. Multi-step sequences across both channels.",
    checks: ["Gmail integration", "WhatsApp Business API", "Multi-step sequences", "Smart scheduling"],
  },
  {
    num: "04",
    title: "She handles replies and books meetings",
    desc: "Arya reads every reply, classifies intent (interested / not now / unsubscribe), drafts the right response, and schedules meetings in your calendar.",
    checks: ["Intent classification", "Auto-draft replies", "Calendar booking", "Follow-up management"],
  },
]

const TESTIMONIALS = [
  {
    quote: "Booked 12 demos in the first week without lifting a finger.",
    name: "Priya Sharma",
    role: "CEO, FinStack",
    initials: "PS",
  },
  {
    quote: "Replaced our entire SDR team. Saving ₹3L/month.",
    name: "Rohan Mehta",
    role: "Founder, LeadStream",
    initials: "RM",
  },
  {
    quote: "The multi-agent approach is genuinely different from other tools.",
    name: "Vikram Iyer",
    role: "VP Sales, PayStack",
    initials: "VI",
  },
]

const PLANS = [
  {
    name: "Free Trial",
    price: "₹0",
    period: "/14 days",
    desc: "No credit card needed",
    features: ["10,000 credits", "All features for 14 days", "Lead search & enrichment", "Gmail integration"],
    cta: "Start free",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "₹6,999",
    period: "/month",
    desc: "Run outbound campaigns",
    features: ["3,000 credits/month", "100 leads", "3 campaigns", "5 multi-agent runs/mo"],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=starter",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹12,999",
    period: "/month",
    desc: "Full outbound automation",
    badge: "Most Popular",
    features: ["8,000 credits/month", "500 leads", "Unlimited campaigns", "25 multi-agent runs/mo", "A/Z testing", "Apollo.io integration"],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=growth",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "₹24,999",
    period: "/month",
    desc: "Best Value vs Artisan",
    features: ["20,000 credits/month", "2,000 leads", "Unlimited campaigns", "Unlimited multi-agent runs", "Dedicated CSM", "Slack support"],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=scale",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Unlimited scale",
    features: ["Custom credits", "SSO/SAML", "Audit logs", "Dedicated implementation"],
    cta: "Book a demo",
    href: "/contact",
    highlighted: false,
  },
]

const FEATURE_CHIPS = [
  "B2B Data", "AI BDR", "Email Generation", "Intent Data",
  "Enrichment", "WhatsApp Outreach", "A/Z Testing", "Deliverability",
  "Local Business Data", "Dialer (soon)",
]


const FAQ = [
  { q: "How does the free trial work?", a: "Sign up and get 10,000 credits for 14 days with all features unlocked. No credit card needed. Explore the full platform, prospecting, email, multi-agent runs, and upgrade when you're ready." },
  { q: "Can Arya send WhatsApp messages?", a: "Yes! Arya supports WhatsApp Business API, a channel where Indian prospects actually respond. This is unavailable in most global tools." },
  { q: "Is this compliant with GDPR and India DPDPA?", a: "Absolutely. All data handling is GDPR and India DPDPA compliant. We provide opt-out links and honor unsubscribe requests automatically." },
  { q: "How is this different from Apollo or Instantly?", a: "Arya is built for India-first B2B. WhatsApp outreach, Hindi/Hinglish support, pricing 5x cheaper than US tools, Indian company database, and flexible payment options." },
  { q: "Can I use my own email domain?", a: "Yes. Connect your Gmail or Google Workspace account. Arya sends from your real email for maximum deliverability." },
  { q: "What if a prospect replies?", a: "Arya reads every reply, classifies the intent, drafts a contextual response, and can book meetings autonomously. You approve or let her handle it." },
]

// Signature ease from design system
const EASE = [0.16, 1, 0.3, 1] as const

// Hero variants — opacity stays at 1 so LCP element is visible from SSR paint
const heroSlideUp = {
  hidden: { y: 20 },
  visible: { y: 0, transition: { duration: 0.55, ease: EASE } },
}

// Below-fold variants — opacity: 0 is fine since these are scrolled to
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

const staggerGrid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const staggerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

// Framer-motion useSpring-based count-up (replaces the hand-rolled RAF version)
function useSpringCount(target: number, inView: boolean) {
  const [display, setDisplay] = useState(0)
  const spring = useSpring(0, { stiffness: 50, damping: 20, mass: 1 })
  useEffect(() => {
    if (inView) spring.set(target)
  }, [inView, target, spring])
  useMotionValueEvent(spring, "change", (v) => {
    setDisplay(Math.round(v))
  })
  return display
}

export default function LandingPage() {
  const statsRef = useRef(null)
  const statsInView = useInView(statsRef, { once: true, amount: 0.4 })
  const count1 = useSpringCount(300, statsInView)         // 300M+ Verified leads
  const count2 = useSpringCount(10000, statsInView)       // 10,000+ Emails sent daily
  const count3 = useSpringCount(500, statsInView)         // 500+ Meetings booked

  const stepsRef = useRef<HTMLDivElement | null>(null)
  const stepsInView = useInView(stepsRef, { once: true, amount: 0.15 })
  const shouldReduceMotion = useReducedMotion()

  return (
    <LazyMotion features={loadFeatures}>
      <div className="min-h-screen bg-white text-gray-900">
        {/* Announcement Bar */}
        <div className="bg-[#6C47FF] text-white text-sm py-2.5 text-center">
          Start free, 10,000 credits included. No credit card required.
          <Link href="/sign-up" className="underline ml-2 font-medium">
            Get started <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>

        {/* Navbar */}
        <Navbar />

        {/* Hero — centered, min-h-90vh */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
          {/* Softer animated gradient blobs (opacity 0.10) with pink accent for mesh feel */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div
              className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full animate-hero-blob"
              style={{ background: "radial-gradient(circle, #6C47FF 0%, transparent 70%)", opacity: 0.10 }}
            />
            <div
              className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-hero-blob-2"
              style={{ background: "radial-gradient(circle, #A855F7 0%, transparent 70%)", opacity: 0.10 }}
            />
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full animate-hero-blob"
              style={{ background: "radial-gradient(circle, #FBCFE8 0%, transparent 70%)", opacity: 0.10 }}
            />
          </div>

          <m.div
            variants={staggerSlow}
            initial="hidden"
            animate="visible"
            className="w-full max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-gray-900">
              <m.span variants={heroSlideUp} className="block">
                Meet <span className="text-[#6C47FF]">Arya</span>
              </m.span>
              <m.span variants={heroSlideUp} className="block">
                Your AI Sales Development Rep
              </m.span>
            </h1>

            <m.p
              variants={heroSlideUp}
              className="max-w-2xl mx-auto mt-6 text-lg md:text-xl text-gray-500 leading-relaxed"
            >
              She finds leads, writes personalized outreach, handles replies,
              and books meetings, at a fraction of the cost of a human SDR.
            </m.p>

            <m.div variants={heroSlideUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6C47FF] px-8 py-3 text-base font-semibold text-white hover:bg-[#5835E8] transition-colors animate-cta-glow"
              >
                Start free. 10,000 credits included <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Book a demo
              </Link>
            </m.div>

            <m.p variants={heroSlideUp} className="text-sm text-gray-500 mt-4">
              No credit card required &middot; 14-day free trial &middot; Cancel anytime
            </m.p>
          </m.div>

          {/* Hero visual — centered avatar with floating context chips */}
          <m.div
            className="relative mt-16 flex justify-center"
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          >
            <AryaAvatar size="xl" animated showBadge />

            {[
              { pos: "top-4 -left-4 md:-left-16", delay: 0.4, icon: Users, label: "250+ Indian companies" },
              { pos: "top-8 -right-4 md:-right-16", delay: 0.5, icon: Mail, label: "Gmail + WhatsApp" },
              { pos: "bottom-24 -left-2 md:-left-20", delay: 0.6, icon: Target, label: "Intent signals" },
              { pos: "bottom-28 -right-2 md:-right-20", delay: 0.7, icon: MessageCircle, label: "Auto-replies" },
            ].map(({ pos, delay, icon: Icon, label }) => (
              <m.div
                key={label}
                className={`hidden md:block absolute ${pos} animate-float`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay, ease: EASE }}
              >
                <span className="rounded-full bg-white shadow-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  <Icon className="inline h-3 w-3 mr-1 text-[#6C47FF]" />{label}
                </span>
              </m.div>
            ))}

            <m.div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-float-delay"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8, ease: EASE }}
            >
              <span className="rounded-full bg-[#6C47FF] shadow-lg px-3 py-1.5 text-xs font-semibold text-white tabular-nums">
                <Sparkles className="inline h-3 w-3 mr-1" />3x reply rates
              </span>
            </m.div>
          </m.div>
        </section>


        {/* Product-proof stats */}
        <section className="bg-[#F9FAFB] border-b border-gray-200 py-24" ref={statsRef}>
          <div className="mx-auto max-w-5xl px-6 text-center">
            <m.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900"
            >
              Built for outbound at scale
            </m.h2>
            <m.div
              variants={staggerGrid}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid md:grid-cols-3 gap-6 mt-12"
            >
              {[
                { display: statsInView ? `${count1}M+` : "0M+", label: "Verified leads" },
                { display: statsInView ? `${count2.toLocaleString()}+` : "0+", label: "Emails sent daily" },
                { display: statsInView ? `${count3}+` : "0+", label: "Meetings booked" },
              ].map((item, i) => (
                <m.div
                  key={i}
                  variants={fadeUp}
                  className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <p className="text-5xl font-bold text-gray-900 tabular-nums">
                    {item.display}
                  </p>
                  <p className="text-sm text-gray-500 uppercase tracking-wider mt-3">{item.label}</p>
                </m.div>
              ))}
            </m.div>
          </div>
        </section>

        {/* With Arya */}
        <section className="bg-[#6C47FF] py-24">
          <div className="mx-auto max-w-5xl px-6 text-center text-white">
            <m.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-4xl md:text-5xl font-semibold tracking-tight"
            >
              With Arya, it&apos;s easy
            </m.h2>
            <m.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
              className="text-violet-200 mt-4 max-w-xl mx-auto text-lg"
            >
              Lead discovery, enrichment, WhatsApp + email sequences, and meeting booking. All in one AI SDR.
            </m.p>
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
              className="flex justify-center mt-10 mb-8"
            >
              <AryaAvatar size="lg" />
            </m.div>
            <m.div
              variants={staggerSlow}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto"
            >
              {FEATURE_CHIPS.map((chip) => (
                <m.span
                  key={chip}
                  variants={fadeUp}
                  className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-sm font-medium text-white"
                >
                  {chip}
                </m.span>
              ))}
            </m.div>
          </div>
        </section>

        {/* How Arya Works — with SVG connecting line */}
        <section id="how" className="mx-auto max-w-6xl px-6 py-24">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">How Arya runs outbound autonomously</h2>
            <p className="text-gray-500 mt-4 text-lg">
              Set your target. Arya finds the leads, runs the campaigns, and books the meetings.
            </p>
          </m.div>

          <div ref={stepsRef} className="relative">
            {/* Decorative connecting line — draws in on scroll */}
            <svg
              className="hidden md:block absolute left-6 top-6 bottom-6 h-[calc(100%-3rem)] w-3 pointer-events-none"
              viewBox="0 0 12 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <m.path
                d="M6 0 L6 100"
                stroke="#6C47FF"
                strokeOpacity="0.35"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 6"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: shouldReduceMotion ? 1 : stepsInView ? 1 : 0 }}
                transition={{ duration: 1.6, ease: EASE }}
              />
            </svg>

            <div className="space-y-16">
              {STEPS.map((step, i) => (
                <m.div
                  key={step.num}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className={`relative flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 items-center md:pl-20`}
                >
                  {/* Numbered anchor circle */}
                  <div className="hidden md:flex absolute left-0 top-6 h-12 w-12 rounded-full bg-[#6C47FF] text-white items-center justify-center font-semibold tabular-nums shadow-md ring-4 ring-white">
                    {i + 1}
                  </div>

                  <div className="flex-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500 tabular-nums">Step {step.num}</span>
                    <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2 mb-4 text-gray-900">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
                      <div className="space-y-3">
                        {step.checks.map((check, ci) => (
                          <m.div
                            key={check}
                            initial={{ opacity: 0, x: -12 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.35, delay: ci * 0.08, ease: EASE }}
                            className="flex items-center gap-3 text-sm"
                          >
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            <span className="text-gray-700">{check}</span>
                          </m.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento grid — Features */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-center mb-14"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Everything you need</p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mt-3">One platform. Seven agents. Zero grunt work.</h2>
          </m.div>

          <m.div
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* [1] Hero tile — 2x2 */}
            <m.div
              variants={fadeUp}
              className="md:col-span-2 md:row-span-2 bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">The multi-agent engine</p>
              <h3 className="text-3xl font-semibold tracking-tight text-gray-900 mt-3 tabular-nums">7 AI Agents Working Together</h3>
              <p className="text-gray-600 mt-3 max-w-md">
                Prospector, researcher, writer, sender, replier, scheduler, analyst. Each agent hands off context so no lead falls through.
              </p>
              {/* Icon chain visualization */}
              <div className="mt-auto pt-8">
                <div className="flex items-center justify-between gap-2">
                  {[Users, Sparkles, PenLine, Send, MessageCircle, Calendar, BarChart3].map((Icon, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-[#EEF2FF] border border-[#6C47FF]/20 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-[#6C47FF]" />
                      </div>
                      {idx < 6 && <div className="hidden sm:block h-px w-3 bg-gray-200" />}
                    </div>
                  ))}
                </div>
              </div>
            </m.div>

            {/* [2] Lead database */}
            <m.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="h-10 w-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center mb-4">
                <Database className="h-5 w-5 text-[#6C47FF]" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-gray-900 tabular-nums">300M+ Lead Database</h3>
              <p className="text-sm text-gray-600 mt-2">Verified B2B contacts across 200 countries.</p>
            </m.div>

            {/* [3] Personalized emails */}
            <m.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="h-10 w-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center mb-4">
                <PenLine className="h-5 w-5 text-[#6C47FF]" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-gray-900">Hyper-Personalized Emails</h3>
              <p className="text-sm text-gray-600 mt-2">Every email is researched, drafted, and tuned per prospect.</p>
            </m.div>

            {/* [4] Multi-channel outreach */}
            <m.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">Channels</p>
              <h3 className="text-xl font-semibold tracking-tight text-gray-900">Multi-Channel Outreach</h3>
              <div className="mt-4 flex items-center gap-2">
                {[Mail, Linkedin, MessageSquare, Phone, Volume2].map((Icon, i) => (
                  <div key={i} className="h-9 w-9 rounded-lg bg-[#F9FAFB] border border-gray-200 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-700" />
                  </div>
                ))}
              </div>
            </m.div>

            {/* [5] CRM integration */}
            <m.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">CRM Integration</p>
              <h3 className="text-xl font-semibold tracking-tight text-gray-900">Sync with your stack</h3>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="rounded-full border border-gray-200 bg-[#F9FAFB] px-3 py-1 text-xs font-medium text-gray-700">HubSpot</span>
                <span className="rounded-full border border-gray-200 bg-[#F9FAFB] px-3 py-1 text-xs font-medium text-gray-700">Salesforce</span>
              </div>
            </m.div>

            {/* [6] Real-time analytics — mini chart */}
            <m.div variants={fadeUp} className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Real-Time Analytics</p>
                  <h3 className="text-xl font-semibold tracking-tight text-gray-900">Every reply, every meeting, tracked live</h3>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-gray-900 tabular-nums">28.4%</span>
                    <span className="text-sm text-emerald-600 tabular-nums">+3.2%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Reply rate this week</p>
                </div>
                <svg viewBox="0 0 200 80" className="h-20 w-40 shrink-0" aria-hidden="true">
                  <defs>
                    <linearGradient id="miniChart" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6C47FF" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6C47FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 60 L20 55 L40 58 L60 42 L80 45 L100 30 L120 34 L140 22 L160 26 L180 14 L200 18 L200 80 L0 80 Z"
                    fill="url(#miniChart)"
                  />
                  <m.path
                    d="M0 60 L20 55 L40 58 L60 42 L80 45 L100 30 L120 34 L140 22 L160 26 L180 14 L200 18"
                    stroke="#6C47FF"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.2, ease: EASE }}
                  />
                </svg>
              </div>
            </m.div>

            {/* [7] Meeting booking — calendar mock */}
            <m.div variants={fadeUp} className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Meeting Booking</p>
                  <h3 className="text-xl font-semibold tracking-tight text-gray-900">Books on your calendar, autonomously</h3>
                  <p className="text-sm text-gray-600 mt-2">Arya proposes times, confirms, and adds calendar invites.</p>
                </div>
                {/* Mini calendar mock */}
                <div className="shrink-0 rounded-xl border border-gray-200 p-3 w-40">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="h-4 w-4 text-[#6C47FF]" />
                    <span className="text-xs font-medium text-gray-500 tabular-nums">Jul 2026</span>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 text-[10px]">
                    {Array.from({ length: 21 }).map((_, i) => {
                      const isBooked = [4, 9, 13, 18].includes(i)
                      return (
                        <div
                          key={i}
                          className={`h-4 rounded flex items-center justify-center tabular-nums ${
                            isBooked ? "bg-[#6C47FF] text-white font-semibold" : "text-gray-400"
                          }`}
                        >
                          {i + 1}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </m.div>
          </m.div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="bg-[#F9FAFB] border-y border-gray-200 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <m.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-4xl md:text-5xl font-semibold tracking-tight text-center text-gray-900"
            >
              What our users say
            </m.h2>
            <m.div
              variants={staggerGrid}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid md:grid-cols-3 gap-6 mt-12"
            >
              {TESTIMONIALS.map(({ quote, name, role, initials }) => (
                <m.div
                  key={name}
                  variants={fadeUp}
                  className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                    <div className="h-10 w-10 rounded-full bg-[#6C47FF] flex items-center justify-center text-sm font-bold text-white">
                      {initials}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{name}</p>
                      <p className="text-xs text-gray-500">{role}</p>
                    </div>
                  </div>
                </m.div>
              ))}
            </m.div>
          </div>
        </section>


        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">Hire Arya</h2>
            <p className="text-gray-500 mt-4 text-lg">Pay a fraction of a human SDR. Start for free.</p>
          </m.div>
          <m.div
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {PLANS.map(({ name, price, period, desc, features, cta, href, highlighted }) => (
              <m.div
                key={name}
                variants={fadeUp}
                whileHover={{ scale: 1.02, y: -5, transition: { duration: 0.2 } }}
                className={`rounded-2xl border p-8 flex flex-col cursor-pointer ${
                  highlighted
                    ? "border-[#6C47FF] ring-2 ring-[#6C47FF] bg-white shadow-lg relative"
                    : "border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow"
                }`}
                style={{ willChange: "transform" }}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#6C47FF] px-3 py-0.5 text-xs font-semibold text-white">
                    Recommended
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-gray-900 tabular-nums">{price}</span>
                  <span className="text-gray-400 text-sm tabular-nums">{period}</span>
                </div>
                <p className="text-sm text-gray-500 mb-5">{desc}</p>
                <ul className="space-y-2 flex-1 mb-6">
                  {features.map((f, fi) => (
                    <m.li
                      key={f}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: fi * 0.06, ease: EASE }}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#6C47FF] shrink-0" />
                      {f}
                    </m.li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold text-center transition-colors ${
                    highlighted
                      ? "bg-[#6C47FF] text-white hover:bg-[#5835E8]"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {cta} <ArrowRight className="inline h-3 w-3 ml-1" />
                </Link>
              </m.div>
            ))}
          </m.div>
          <m.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-6"
          >
            <Link href="/pricing" className="text-sm text-[#6C47FF] hover:underline font-medium">
              See full feature comparison <ArrowRight className="inline h-3 w-3" />
            </Link>
          </m.div>
        </section>

        {/* Cost Comparison */}
        <section className="bg-[#F9FAFB] border-y border-gray-200 py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <m.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-4xl md:text-5xl font-semibold tracking-tight mb-12 text-gray-900"
            >
              A fraction of the cost of a human SDR
            </m.h2>
            <m.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <div className="rounded-2xl bg-white border-2 border-gray-300 p-8 flex-1 max-w-xs shadow-sm">
                <p className="text-sm text-gray-500 mb-2 font-medium">A human SDR</p>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">&#8377;50,000</p>
                <p className="text-sm text-gray-400 mt-1 tabular-nums">/month</p>
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#6C47FF] text-white font-bold text-sm shrink-0">
                vs
              </div>
              <div className="rounded-2xl bg-white border-2 border-[#6C47FF] p-8 flex-1 max-w-xs shadow-lg">
                <p className="text-sm text-[#6C47FF] mb-2 font-medium">Arya</p>
                <p className="text-4xl font-bold text-[#6C47FF] tabular-nums">&#8377;6,999</p>
                <p className="text-sm text-gray-400 mt-1 tabular-nums">/month</p>
                <p className="text-sm text-emerald-600 font-semibold mt-3 tabular-nums">Save &#8377;43,000/month</p>
              </div>
            </m.div>
          </div>
        </section>

        {/* Final CTA — light lavender */}
        <section className="bg-[#EEF2FF] py-24">
          <m.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mx-auto max-w-3xl px-6 text-center text-gray-900"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Put your outbound on autopilot</h2>
            <p className="text-gray-600 mt-4 text-lg">
              Start free. 10,000 credits included. No credit card needed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6C47FF] px-8 py-3 text-base font-semibold text-white hover:bg-[#5835E8] transition-colors"
              >
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Talk to sales
              </Link>
            </div>
          </m.div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-24">
          <m.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-4xl md:text-5xl font-semibold tracking-tight text-center mb-12 text-gray-900"
          >
            Frequently asked questions
          </m.h2>
          <m.div
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="space-y-4"
          >
            {FAQ.map(({ q, a }) => (
              <m.details key={q} variants={fadeUp} className="rounded-2xl border border-gray-200 bg-white p-6 group">
                <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{a}</p>
              </m.details>
            ))}
          </m.div>
        </section>

        {/* Footer */}
        <footer className="bg-[#1E1B4B] text-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            {/* Newsletter + brand row */}
            <div className="grid md:grid-cols-2 gap-10 items-start pb-12 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AryaAvatar size="sm" />
                  <span className="font-bold">AI SDR</span>
                </div>
                <p className="text-sm text-violet-300 max-w-sm">
                  India&apos;s AI Sales Development Representative. Powered by Claude.
                </p>
                {/* Compliance badges */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-violet-200">
                    <Zap className="h-3 w-3" /> SOC 2 &middot; Compliant
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-violet-200">
                    <Zap className="h-3 w-3" /> GDPR &middot; Ready
                  </span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Get the outbound playbook, monthly</h4>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault() }}
                >
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder:text-violet-300 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-[#6C47FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5835E8] transition-colors"
                  >
                    Subscribe
                  </button>
                </form>
                <p className="text-xs text-violet-400 mt-2">No spam. Unsubscribe anytime.</p>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
              <div>
                <h4 className="font-semibold text-sm mb-3">Product</h4>
                <ul className="space-y-2 text-sm text-violet-300">
                  <li><Link href="/sign-up" className="hover:text-white transition-colors">Get Started</Link></li>
                  <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">Book a Demo</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Resources</h4>
                <ul className="space-y-2 text-sm text-violet-300">
                  <li><Link href="/contact" className="hover:text-white transition-colors">Support</Link></li>
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Company</h4>
                <ul className="space-y-2 text-sm text-violet-300">
                  <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Follow</h4>
                <div className="flex items-center gap-3">
                  <a href="#" aria-label="Twitter" className="h-9 w-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-violet-200 hover:text-white hover:bg-white/10 transition-colors">
                    <Twitter className="h-4 w-4" />
                  </a>
                  <a href="#" aria-label="LinkedIn" className="h-9 w-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-violet-200 hover:text-white hover:bg-white/10 transition-colors">
                    <Linkedin className="h-4 w-4" />
                  </a>
                  <a href="#" aria-label="YouTube" className="h-9 w-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-violet-200 hover:text-white hover:bg-white/10 transition-colors">
                    <Youtube className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 mt-12 pt-6 text-center text-xs text-violet-400">
              &copy; 2026 AI SDR. GDPR &amp; India DPDPA compliant.
            </div>
          </div>
        </footer>
      </div>
    </LazyMotion>
  )
}
