import Link from "next/link";
import { CheckCircle2, Zap, Mail, Linkedin, MessageCircle, Calendar } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "We booked 8 enterprise meetings in 3 weeks using AI SDR. The personalization is insane.",
    name: "Arjun Mehta",
    role: "Founder, TechStack.in",
    avatar: "AM",
  },
  {
    quote: "Replaced our ₹1.2L/month SDR team with this. Better results, fraction of the cost.",
    name: "Priya Sharma",
    role: "CEO, GrowthOS",
    avatar: "PS",
  },
  {
    quote: "Prospects think we researched them manually. Our reply rate went from 2% to 19%.",
    name: "Rahul Nair",
    role: "Head of Sales, Zepto",
    avatar: "RN",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Import your leads",
    description: "Upload a CSV or let AI find your ideal customers automatically.",
  },
  {
    step: "02",
    title: "AI researches each prospect",
    description: "Scans LinkedIn, their website, funding news, and recent posts.",
  },
  {
    step: "03",
    title: "Personalized messages sent automatically",
    description: "Hyper-personal emails, LinkedIn DMs, and WhatsApp — on schedule.",
  },
  {
    step: "04",
    title: "Just show up to meetings",
    description: "Replies handled, meetings booked. You focus on closing.",
  },
];

const PLANS = [
  {
    name: "Starter",
    priceINR: "₹15,000",
    priceUSD: "$200",
    period: "/month",
    features: ["500 leads", "1,000 emails/month", "LinkedIn DMs", "AI research", "Full analytics"],
    cta: "Start with Starter",
    href: "/sign-up?plan=starter",
  },
  {
    name: "Growth",
    priceINR: "₹30,000",
    priceUSD: "$500",
    period: "/month",
    popular: true,
    features: [
      "2,000 leads",
      "5,000 emails/month",
      "Email + LinkedIn + WhatsApp",
      "AI lead finder (100/mo)",
      "3 email accounts",
    ],
    cta: "Start Growing",
    href: "/sign-up?plan=growth",
  },
  {
    name: "Scale",
    priceINR: "₹50,000",
    priceUSD: "$1,000",
    period: "/month",
    features: [
      "Unlimited leads",
      "Unlimited emails",
      "All channels",
      "AI lead finder (500/mo)",
      "Dedicated account manager",
    ],
    cta: "Talk to Sales",
    href: "/sign-up?plan=scale",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">AI SDR</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Average user books 12 meetings in first 30 days
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl mb-6">
          Your AI Sales Team.
          <br />
          <span className="text-blue-500">Hire it for ₹15K/month.</span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          AI that finds your ideal customers, writes personalized outreach, and books meetings —
          automatically. For Indian B2B startups and global companies.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold hover:bg-blue-500 transition-colors"
          >
            Start Free (50 leads)
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-semibold hover:bg-white/5 transition-colors"
          >
            See Demo
          </Link>
        </div>
        <p className="text-sm text-zinc-500 mt-4">No credit card required</p>
      </section>

      <section className="border-y border-white/10 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 text-center mb-6">
            Works with your existing stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-zinc-400">
            {[
              { icon: Mail, label: "Gmail" },
              { icon: Linkedin, label: "LinkedIn" },
              { icon: MessageCircle, label: "WhatsApp" },
              { icon: Calendar, label: "Google Calendar" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Sales is broken for startups</h2>
          <p className="text-zinc-400 mt-3">You know the pain points</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              pain: "Good SDRs cost ₹80K+/month",
              detail: "And great ones don't join early startups.",
            },
            {
              pain: "Manual outreach = 4 hours/day",
              detail: "That's time founders simply don't have.",
            },
            {
              pain: "Generic templates get 2% replies",
              detail: "Personalization takes forever manually.",
            },
          ].map(({ pain, detail }) => (
            <div
              key={pain}
              className="rounded-xl border border-red-500/20 bg-red-500/5 p-6"
            >
              <p className="font-semibold text-red-400">😤 {pain}</p>
              <p className="text-sm text-zinc-400 mt-2">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map(({ step, title, description }) => (
            <div key={step} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="text-4xl font-bold text-blue-500/30 mb-3">{step}</p>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Real results from real founders</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, role, avatar }) => (
            <div key={name} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="text-zinc-300 italic mb-6">&ldquo;{quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                  {avatar}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{name}</p>
                  <p className="text-xs text-zinc-500">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20" id="pricing">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="text-zinc-400 mt-3">
            Start with 50 free leads. No credit card required.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(({ name, priceINR, priceUSD, period, features, cta, href, popular }) => (
            <div
              key={name}
              className={`rounded-xl border p-6 flex flex-col ${
                popular
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {popular && (
                <span className="self-start rounded-full bg-blue-500 px-3 py-0.5 text-xs font-semibold mb-3">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{name}</h3>
              <div className="mt-3 mb-6">
                <span className="text-3xl font-bold">{priceINR}</span>
                <span className="text-zinc-400 text-sm">{period}</span>
                <p className="text-zinc-500 text-sm mt-1">{priceUSD}/month for US companies</p>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className={`rounded-lg px-4 py-3 text-sm font-semibold text-center transition-colors ${
                  popular
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "border border-white/20 hover:bg-white/5 text-white"
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Ready to close more deals?
        </h2>
        <p className="text-zinc-400 mb-8">
          Join hundreds of Indian B2B startups automating their outreach.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold hover:bg-blue-500 transition-colors"
        >
          Start Free — 50 leads included
        </Link>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold">AI SDR</span>
          </div>
          <p className="text-xs text-zinc-500">
            © 2026 AI SDR. GDPR & India DPDPA compliant.
          </p>
          <div className="flex gap-4 text-xs text-zinc-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
