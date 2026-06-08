import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceINR: "₹15,000",
    priceUSD: "$200",
    features: ["500 leads", "1,000 emails/month", "LinkedIn DMs", "AI research"],
  },
  {
    id: "growth",
    name: "Growth",
    priceINR: "₹30,000",
    priceUSD: "$500",
    popular: true,
    features: ["2,000 leads", "5,000 emails/month", "All channels", "AI lead finder 100/mo"],
  },
  {
    id: "scale",
    name: "Scale",
    priceINR: "₹50,000",
    priceUSD: "$1,000",
    features: ["Unlimited leads", "Unlimited emails", "AI lead finder 500/mo", "Dedicated support"],
  },
];

export default async function BillingPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Billing</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(({ id, name, priceINR, priceUSD, features, popular }) => (
          <div
            key={id}
            className={`rounded-xl border p-5 flex flex-col ${
              popular ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {popular && (
              <span className="self-start rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white mb-2">
                Popular
              </span>
            )}
            <h3 className="font-bold text-foreground text-lg">{name}</h3>
            <p className="text-2xl font-bold text-foreground mt-2">
              {priceINR}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">{priceUSD}/month USD</p>
            <ul className="space-y-2 flex-1 mb-5">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
              popular
                ? "bg-primary text-white hover:bg-primary/90"
                : "border border-border text-foreground hover:bg-accent"
            }`}>
              Upgrade to {name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
