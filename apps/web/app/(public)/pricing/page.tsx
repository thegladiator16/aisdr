import Link from "next/link";
import { CheckCircle2, Zap } from "lucide-react";

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

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">AI SDR</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-white">
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

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">Simple pricing</h1>
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

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold">AI SDR</span>
          </div>
          <p className="text-xs text-zinc-500">© 2026 AI SDR. GDPR & India DPDPA compliant.</p>
        </div>
      </footer>
    </div>
  );
}
