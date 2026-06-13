import Link from "next/link";
import { CheckCircle2, ArrowRight, Mail, MessageCircle, Calendar, Star, Zap, BarChart2, Shield, Users, Target, Sparkles } from "lucide-react";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

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
    desc: "Unlike global tools, Arya supports WhatsApp Business API — the channel where Indian founders actually respond. Multi-step sequences across both channels.",
    checks: ["Gmail integration", "WhatsApp Business API", "Multi-step sequences", "Smart scheduling"],
  },
  {
    num: "04",
    title: "She handles replies and books meetings",
    desc: "Arya reads every reply, classifies intent (interested / not now / unsubscribe), drafts the right response, and schedules meetings in your calendar.",
    checks: ["Intent classification", "Auto-draft replies", "Calendar booking", "Follow-up management"],
  },
];

const TESTIMONIALS = [
  {
    quote: "Replaced our entire outbound team. Arya books 12 meetings a month.",
    name: "Rahul Sharma",
    role: "CEO, FinStack",
    initials: "RS",
  },
  {
    quote: "We're getting a ₹800 cost per qualified lead. Way better than any SDR tool we tried.",
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
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    desc: "No credit card needed",
    features: ["50 leads/month", "100 emails/month", "Gmail integration", "Basic analytics"],
    cta: "Start free",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "₹15,000",
    period: "/month",
    desc: "Run outbound campaigns",
    features: ["500 leads/month", "2,000 emails/month", "WhatsApp integration", "Intent signals", "Reply drafting"],
    cta: "Start 14-day trial",
    href: "/sign-up?plan=starter",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹30,000",
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
];

const FEATURE_CHIPS = [
  "B2B Data", "AI BDR", "Email Generation", "Intent Data",
  "Enrichment", "WhatsApp Outreach", "A/Z Testing", "Deliverability",
  "Local Business Data", "Dialer (soon)",
];

const PRESS = ["YourStory", "Inc42", "Economic Times", "Entrackr", "StartupStories"];

const FAQ = [
  { q: "How does the free plan work?", a: "Sign up and get 50 leads and 100 emails per month, forever. No credit card needed. Upgrade when you're ready." },
  { q: "Can Arya send WhatsApp messages?", a: "Yes! Arya supports WhatsApp Business API — a channel where Indian prospects actually respond. This is unavailable in most global tools." },
  { q: "Is this compliant with GDPR and India DPDPA?", a: "Absolutely. All data handling is GDPR and India DPDPA compliant. We provide opt-out links and honor unsubscribe requests automatically." },
  { q: "How is this different from Apollo or Instantly?", a: "Arya is built for India-first B2B. WhatsApp outreach, Hindi/Hinglish support, INR pricing 5x cheaper, Indian company database, and Razorpay payments." },
  { q: "Can I use my own email domain?", a: "Yes. Connect your Gmail or Google Workspace account. Arya sends from your real email for maximum deliverability." },
  { q: "What if a prospect replies?", a: "Arya reads every reply, classifies the intent, drafts a contextual response, and can book meetings autonomously. You approve or let her handle it." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A]">
      {/* Section 1: Announcement Bar */}
      <div className="bg-[#6C47FF] text-white text-sm py-2.5 text-center">
        Start free — 50 leads included. No credit card required.
        <Link href="/sign-up" className="underline ml-2 font-medium">
          Get started <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>

      {/* Section 2: Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <AryaAvatar size="sm" />
            <span className="font-bold text-gray-900 text-lg">AI SDR</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#how" className="text-sm text-gray-600 hover:text-gray-900">Product</Link>
            <Link href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900">Solutions</Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/contact" className="hidden sm:inline-flex text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
              Get a demo
            </Link>
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

      {/* Section 3: Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
              Meet <span className="text-[#6C47FF]">Arya</span>
              <br />
              Your AI Sales
              <br />
              Development Rep
            </h1>
            <p className="text-lg text-gray-500 mt-6 max-w-lg leading-relaxed">
              She finds leads, writes personalized outreach, handles replies,
              and books meetings — at a fraction of the cost of a human SDR.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C47FF] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#5A38E0] transition-colors"
              >
                Start free — 50 leads included <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Book a demo
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Trusted by 500+ B2B founders across India
            </p>
          </div>
          <div className="relative flex justify-center">
            <AryaAvatar size="xl" animated showBadge />
            <div className="absolute top-4 left-0 animate-float">
              <span className="rounded-full bg-white shadow-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                <Users className="inline h-3 w-3 mr-1 text-[#6C47FF]" />250+ Indian companies
              </span>
            </div>
            <div className="absolute top-8 right-0 animate-float-delay">
              <span className="rounded-full bg-white shadow-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                <Mail className="inline h-3 w-3 mr-1 text-[#6C47FF]" />Gmail + WhatsApp
              </span>
            </div>
            <div className="absolute bottom-24 left-4 animate-float-delay-2">
              <span className="rounded-full bg-white shadow-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                <Target className="inline h-3 w-3 mr-1 text-[#6C47FF]" />Intent signals
              </span>
            </div>
            <div className="absolute bottom-28 right-4 animate-float">
              <span className="rounded-full bg-white shadow-lg border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                <MessageCircle className="inline h-3 w-3 mr-1 text-[#6C47FF]" />Auto-replies
              </span>
            </div>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-float-delay">
              <span className="rounded-full bg-[#6C47FF] shadow-lg px-3 py-1.5 text-xs font-semibold text-white">
                <Sparkles className="inline h-3 w-3 mr-1" />3x reply rates
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Pain Section */}
      <section className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold">Outbound was impossible to scale</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { stat: "₹80,000/month", label: "Average cost of one human SDR in India" },
              { stat: "200+ hours", label: "Wasted on manual prospecting per month" },
              { stat: "2% reply rate", label: "Average cold email reply rate without AI" },
            ].map((item) => (
              <div key={item.stat} className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <p className="text-3xl font-bold text-red-500">{item.stat}</p>
                <p className="text-sm text-gray-500 mt-2">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: With Arya */}
      <section className="bg-[#6C47FF] py-20">
        <div className="mx-auto max-w-5xl px-6 text-center text-white">
          <h2 className="text-3xl font-bold">With Arya, it&apos;s easy</h2>
          <p className="text-violet-200 mt-3 max-w-xl mx-auto">
            Lead discovery, enrichment, WhatsApp + email sequences, and meeting booking. All in one AI SDR.
          </p>
          <div className="flex justify-center mt-10 mb-8">
            <AryaAvatar size="lg" />
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {FEATURE_CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-sm font-medium text-white"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: How Arya Works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold">How Arya runs outbound autonomously</h2>
          <p className="text-gray-500 mt-3">
            Set your target. Arya finds the leads, runs the campaigns, and books the meetings.
          </p>
        </div>
        <div className="space-y-16">
          {STEPS.map((step, i) => (
            <div key={step.num} className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 items-center`}>
              <div className="flex-1">
                <span className="text-sm font-semibold text-[#6C47FF]">Step {step.num}</span>
                <h3 className="text-2xl font-bold mt-2 mb-4">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                  <div className="space-y-3">
                    {step.checks.map((check) => (
                      <div key={check} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span className="text-gray-700">{check}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: Testimonials */}
      <section id="testimonials" className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-center">Trusted by 500+ B2B founders</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {TESTIMONIALS.map(({ quote, name, role, initials }) => (
              <div key={name} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8: Press */}
      <section className="py-12 border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">As seen in</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {PRESS.map((name) => (
              <span key={name} className="text-lg font-semibold text-gray-300">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Section 9: Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Hire Arya</h2>
          <p className="text-gray-500 mt-3">Pay a fraction of a human SDR. Start for free.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(({ name, price, period, desc, features, cta, href, highlighted }) => (
            <div
              key={name}
              className={`rounded-2xl border p-6 flex flex-col ${
                highlighted
                  ? "border-[#6C47FF] ring-2 ring-[#6C47FF]/20 bg-white shadow-lg relative"
                  : "border-gray-200 bg-white"
              }`}
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
                  highlighted
                    ? "bg-[#6C47FF] text-white hover:bg-[#5A38E0]"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {cta} <ArrowRight className="inline h-3 w-3 ml-1" />
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/pricing" className="text-sm text-[#6C47FF] hover:underline font-medium">
            See full feature comparison <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Section 10: Cost Comparison */}
      <section className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold mb-10">A fraction of the cost of a human SDR</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="rounded-2xl bg-white border border-gray-200 p-8 flex-1 max-w-xs shadow-sm">
              <p className="text-sm text-gray-500 mb-2">A human SDR</p>
              <p className="text-4xl font-bold text-red-500">{"₹"}80,000</p>
              <p className="text-sm text-gray-400 mt-1">/month</p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#6C47FF] text-white font-bold text-sm shrink-0">
              vs
            </div>
            <div className="rounded-2xl bg-white border-2 border-[#6C47FF] p-8 flex-1 max-w-xs shadow-lg">
              <p className="text-sm text-[#6C47FF] mb-2 font-medium">Arya</p>
              <p className="text-4xl font-bold text-[#6C47FF]">{"₹"}15,000</p>
              <p className="text-sm text-gray-400 mt-1">/month</p>
              <p className="text-sm text-emerald-600 font-semibold mt-3">
                Save {"₹"}65,000/month
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 11: Final CTA */}
      <section className="bg-[#6C47FF] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center text-white">
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
        </div>
      </section>

      {/* Section 12: FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
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
                <li><Link href="/sign-up" className="hover:text-white">Get Started</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/contact" className="hover:text-white">Book a Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-violet-300">
                <li><Link href="/contact" className="hover:text-white">Support</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-violet-300">
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-6 text-center text-xs text-violet-400">
            &copy; 2026 AI SDR. GDPR & India DPDPA compliant.
          </div>
        </div>
      </footer>
    </div>
  );
}
