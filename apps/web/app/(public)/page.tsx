"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { motion, useInView } from "framer-motion"
import { CheckCircle2, ArrowRight, Mail, MessageCircle, Star, Users, Target, Sparkles } from "lucide-react"
import { AryaAvatar } from "@/components/arya/AryaAvatar"
import { Navbar } from "@/components/layout/Navbar"

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
    quote: "Replaced our entire outbound team. Arya books 12 meetings a month.",
    name: "Rahul Sharma",
    role: "CEO, FinStack",
    initials: "RS",
  },
  {
    quote: "We're getting a $10 cost per qualified lead. Way better than any SDR tool we tried.",
    name: "Priya Mehta",
    role: "Growth Lead, SellSmart",
    initials: "PM",
  },
  {
    quote: "WhatsApp integration alone makes this 10x better than Apollo for Indian market.",
    name: "Vikram Singh",
    role: "Founder, TechBridge",
    initials: "VS",
  },
]

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "No credit card needed",
    features: ["50 leads/month", "100 emails/month", "Gmail integration", "Basic analytics"],
    cta: "Start free",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$79",
    period: "/month",
    desc: "Run outbound campaigns",
    features: ["500 leads/month", "2,000 emails/month", "WhatsApp integration", "Intent signals", "Reply drafting"],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=starter",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$139",
    period: "/month",
    desc: "Full outbound automation",
    features: ["2,000 leads/month", "10,000 emails/month", "Everything in Starter", "CRM integrations", "A/Z testing", "Priority support"],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=growth",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Unlimited scale",
    features: ["Unlimited leads", "Dedicated CSM", "SSO/SAML", "Audit logs", "Slack channel"],
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

const PRESS = ["YourStory", "Inc42", "Economic Times", "Entrackr", "StartupStories"]

const FAQ = [
  { q: "How does the free plan work?", a: "Sign up and get 50 leads and 100 emails per month, forever. No credit card needed. Upgrade when you're ready." },
  { q: "Can Arya send WhatsApp messages?", a: "Yes! Arya supports WhatsApp Business API, a channel where Indian prospects actually respond. This is unavailable in most global tools." },
  { q: "Is this compliant with GDPR and India DPDPA?", a: "Absolutely. All data handling is GDPR and India DPDPA compliant. We provide opt-out links and honor unsubscribe requests automatically." },
  { q: "How is this different from Apollo or Instantly?", a: "Arya is built for India-first B2B. WhatsApp outreach, Hindi/Hinglish support, pricing 5x cheaper than US tools, Indian company database, and flexible payment options." },
  { q: "Can I use my own email domain?", a: "Yes. Connect your Gmail or Google Workspace account. Arya sends from your real email for maximum deliverability." },
  { q: "What if a prospect replies?", a: "Arya reads every reply, classifies the intent, drafts a contextual response, and can book meetings autonomously. You approve or let her handle it." },
]

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const staggerGrid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const staggerSlow = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

// Count-up hook for stats
function useCountUp(end: number, inView: boolean, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, end, duration])
  return val
}

export default function LandingPage() {
  // Stats count-up
  const statsRef = useRef(null)
  const statsInView = useInView(statsRef, { once: true, amount: 0.4 })
  const count1 = useCountUp(999, statsInView)
  const count2 = useCountUp(200, statsInView)
  const count3 = useCountUp(2, statsInView)

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A]">
      {/* Announcement Bar */}
      <div className="bg-[#6C47FF] text-white text-sm py-2.5 text-center">
        Start free, 50 leads included. No credit card required.
        <Link href="/sign-up" className="underline ml-2 font-medium">
          Get started <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>

      {/* Navbar */}
      <Navbar />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 overflow-hidden">
        {/* Animated gradient blobs behind hero */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div
            className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full animate-hero-blob"
            style={{ background: "radial-gradient(circle, #6C47FF 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-hero-blob-2"
            style={{ background: "radial-gradient(circle, #A855F7 0%, transparent 70%)" }}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <div>
            {/* Staggered headline */}
            <motion.div
              variants={staggerSlow}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
                <span className="overflow-hidden block">
                  <motion.span variants={fadeUp} className="block">
                    Meet <span className="text-[#6C47FF]">Arya</span>
                  </motion.span>
                </span>
                <span className="overflow-hidden block">
                  <motion.span variants={fadeUp} className="block">
                    Your AI Sales
                  </motion.span>
                </span>
                <span className="overflow-hidden block">
                  <motion.span variants={fadeUp} className="block">
                    Development Rep
                  </motion.span>
                </span>
              </h1>

              <motion.p
                variants={fadeUp}
                className="text-lg text-gray-500 mt-6 max-w-lg leading-relaxed"
              >
                She finds leads, writes personalized outreach, handles replies,
                and books meetings, at a fraction of the cost of a human SDR.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C47FF] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#5A38E0] transition-colors animate-cta-glow"
                >
                  Start free. 50 leads included <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Book a demo
                </Link>
              </motion.div>

              <motion.p variants={fadeUp} className="text-sm text-gray-400 mt-4">
                Trusted by 500+ B2B founders across India
              </motion.p>
            </motion.div>
          </div>

          {/* Right — avatar with floating badges */}
          <motion.div
            className="relative flex justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <AryaAvatar size="xl" animated showBadge />

            {[
              { pos: "top-4 left-0", delay: 0.4, icon: Users, label: "250+ Indian companies" },
              { pos: "top-8 right-0", delay: 0.5, icon: Mail, label: "Gmail + WhatsApp" },
              { pos: "bottom-24 left-4", delay: 0.6, icon: Target, label: "Intent signals" },
              { pos: "bottom-28 right-4", delay: 0.7, icon: MessageCircle, label: "Auto-replies" },
            ].map(({ pos, delay, icon: Icon, label }) => (
              <motion.div
                key={label}
                className={`absolute ${pos} animate-float`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="rounded-full bg-white shadow-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  <Icon className="inline h-3 w-3 mr-1 text-[#6C47FF]" />{label}
                </span>
              </motion.div>
            ))}

            <motion.div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-float-delay"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="rounded-full bg-[#6C47FF] shadow-lg px-3 py-1.5 text-xs font-semibold text-white">
                <Sparkles className="inline h-3 w-3 mr-1" />3x reply rates
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pain Stats */}
      <section className="bg-gray-50 border-y border-gray-200 py-20" ref={statsRef}>
        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold"
          >
            Outbound was impossible to scale
          </motion.h2>
          <motion.div
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-3 gap-6 mt-10"
          >
            {[
              { prefix: "$", num: count1, suffix: "/month", label: "Average cost of one human SDR" },
              { prefix: "", num: count2, suffix: "+ hours", label: "Wasted on manual prospecting per month" },
              { prefix: "", num: count3, suffix: "% reply rate", label: "Average cold email reply rate without AI" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 card-lift"
              >
                <p className="text-3xl font-bold text-red-500">
                  {item.prefix}{statsInView ? item.num.toLocaleString() : 0}{item.suffix}
                </p>
                <p className="text-sm text-gray-500 mt-2">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* With Arya */}
      <section className="bg-[#6C47FF] py-20">
        <div className="mx-auto max-w-5xl px-6 text-center text-white">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold"
          >
            With Arya, it&apos;s easy
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-violet-200 mt-3 max-w-xl mx-auto"
          >
            Lead discovery, enrichment, WhatsApp + email sequences, and meeting booking. All in one AI SDR.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mt-10 mb-8"
          >
            <AryaAvatar size="lg" />
          </motion.div>
          <motion.div
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto"
          >
            {FEATURE_CHIPS.map((chip) => (
              <motion.span
                key={chip}
                variants={fadeUp}
                className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-sm font-medium text-white"
              >
                {chip}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How Arya Works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl font-bold">How Arya runs outbound autonomously</h2>
          <p className="text-gray-500 mt-3">
            Set your target. Arya finds the leads, runs the campaigns, and books the meetings.
          </p>
        </motion.div>
        <div className="space-y-16">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 items-center`}
            >
              <div className="flex-1">
                <span className="text-sm font-semibold text-[#6C47FF]">Step {step.num}</span>
                <h3 className="text-2xl font-bold mt-2 mb-4">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm card-lift">
                  <div className="space-y-3">
                    {step.checks.map((check, ci) => (
                      <motion.div
                        key={check}
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: ci * 0.08 }}
                        className="flex items-center gap-3 text-sm"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span className="text-gray-700">{check}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-center"
          >
            Trusted by 500+ B2B founders
          </motion.h2>
          <motion.div
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-3 gap-6 mt-10"
          >
            {TESTIMONIALS.map(({ quote, name, role, initials }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm card-lift"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                  <div className="h-10 w-10 rounded-full bg-[#6C47FF] flex items-center justify-center text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{name}</p>
                    <p className="text-xs text-gray-500">{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Press — infinite marquee */}
      <section className="py-12 border-b border-gray-200 overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 text-center mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">As seen in</p>
        </div>
        {/* Double the list so seamless loop works */}
        <div className="relative overflow-hidden">
          <div className="flex animate-marquee gap-16 w-max">
            {[...PRESS, ...PRESS].map((name, i) => (
              <span key={i} className="text-lg font-semibold text-gray-300 shrink-0">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold">Hire Arya</h2>
          <p className="text-gray-500 mt-3">Pay a fraction of a human SDR. Start for free.</p>
        </motion.div>
        <motion.div
          variants={staggerGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {PLANS.map(({ name, price, period, desc, features, cta, href, highlighted }) => (
            <motion.div
              key={name}
              variants={fadeUp}
              whileHover={{ scale: 1.02, y: -5, transition: { duration: 0.2 } }}
              className={`rounded-2xl border p-6 flex flex-col cursor-pointer ${
                highlighted
                  ? "border-[#6C47FF] ring-2 ring-[#6C47FF]/20 bg-white shadow-lg relative"
                  : "border-gray-200 bg-white shadow-sm"
              }`}
              style={{ willChange: "transform" }}
            >
              {highlighted && (
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
                {features.map((f, fi) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: fi * 0.06 }}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#6C47FF] shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <Link
                href={href}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-center transition-colors ${
                  highlighted
                    ? "bg-[#6C47FF] text-white hover:bg-[#5A38E0]"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {cta} <ArrowRight className="inline h-3 w-3 ml-1" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-6"
        >
          <Link href="/pricing" className="text-sm text-[#6C47FF] hover:underline font-medium">
            See full feature comparison <ArrowRight className="inline h-3 w-3" />
          </Link>
        </motion.div>
      </section>

      {/* Cost Comparison */}
      <section className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-10"
          >
            A fraction of the cost of a human SDR
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <div className="rounded-2xl bg-white border-2 border-red-400 p-8 flex-1 max-w-xs shadow-lg card-lift">
              <p className="text-sm text-red-400 mb-2 font-medium">A human SDR</p>
              <p className="text-4xl font-bold text-red-500">$999</p>
              <p className="text-sm text-gray-400 mt-1">/month</p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#6C47FF] text-white font-bold text-sm shrink-0">
              vs
            </div>
            <div className="rounded-2xl bg-white border-2 border-[#6C47FF] p-8 flex-1 max-w-xs shadow-lg card-lift">
              <p className="text-sm text-[#6C47FF] mb-2 font-medium">Arya</p>
              <p className="text-4xl font-bold text-[#6C47FF]">$79</p>
              <p className="text-sm text-gray-400 mt-1">/month</p>
              <p className="text-sm text-emerald-600 font-semibold mt-3">Save $920/month</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#6C47FF] py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl px-6 text-center text-white"
        >
          <h2 className="text-4xl font-bold">Put your outbound on autopilot</h2>
          <p className="text-violet-200 mt-4 text-lg">
            Start free. 50 leads included. No credit card needed.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#6C47FF] hover:bg-gray-100 transition-colors"
          >
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-center mb-10"
        >
          Frequently asked questions
        </motion.h2>
        <motion.div
          variants={staggerGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="space-y-4"
        >
          {FAQ.map(({ q, a }) => (
            <motion.details key={q} variants={fadeUp} className="rounded-xl border border-gray-200 bg-white p-5 group">
              <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
                {q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
              </summary>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{a}</p>
            </motion.details>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E1B4B] text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AryaAvatar size="sm" />
                <span className="font-bold">AI SDR</span>
              </div>
              <p className="text-sm text-violet-300">
                India&apos;s AI Sales Development Representative. Powered by Claude.
              </p>
            </div>
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
          </div>
          <div className="border-t border-white/10 mt-12 pt-6 text-center text-xs text-violet-400">
            &copy; 2026 AI SDR. GDPR &amp; India DPDPA compliant.
          </div>
        </div>
      </footer>
    </div>
  )
}
