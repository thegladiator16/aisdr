import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { Shield, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Mail, ArrowDown } from "lucide-react";
import { MailboxHealthWidget } from "./MailboxHealthWidget";

function StatusBadge({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Configured
      </span>
    );
  if (status === "warn")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
        <AlertTriangle className="h-3 w-3" /> Review needed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
      <XCircle className="h-3 w-3" /> Not set
    </span>
  );
}

export default function DeliverabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deliverability</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your email health and inbox placement
        </p>
      </div>

      <MailboxHealthWidget />

      {/* Domain Health Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-6">
        <div className="h-20 w-20 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
          <span className="text-3xl font-bold text-emerald-600">A</span>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Domain Health Score</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your domain is well configured for email deliverability. All DNS records are properly set up.
          </p>
        </div>
      </div>

      {/* DNS Records */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            name: "SPF Record",
            desc: "Authorizes which servers can send email for your domain",
            status: "pass" as const,
          },
          {
            name: "DKIM Signing",
            desc: "Cryptographic signature that verifies email authenticity",
            status: "pass" as const,
          },
          {
            name: "DMARC Policy",
            desc: "Tells receiving servers how to handle unauthenticated mail",
            status: "warn" as const,
          },
        ].map(({ name, desc, status }) => (
          <div key={name} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">{name}</h3>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Inbox Placement", value: "94%", icon: Mail, color: "text-emerald-600 bg-emerald-50" },
          { label: "Bounce Rate", value: "1.2%", icon: ArrowDown, color: "text-blue-600 bg-blue-50" },
          { label: "Unsubscribe Rate", value: "0.4%", icon: XCircle, color: "text-amber-600 bg-amber-50" },
          { label: "Warmup Progress", value: "85%", icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className={`h-10 w-10 rounded-lg ${color.split(" ")[1]} flex items-center justify-center mb-3`}>
              <Icon className={`h-5 w-5 ${color.split(" ")[0]}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Arya's Recommendations */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AryaAvatar size="sm" />
          <h2 className="font-semibold text-gray-900">Arya&apos;s Recommendations</h2>
        </div>
        <ul className="space-y-3">
          {[
            "Set a DMARC policy to 'quarantine' or 'reject' to improve trust with receiving servers.",
            "Keep daily send volume under 50 emails during the first 2 weeks of warmup.",
            "Your inbox placement rate is great (94%). Maintain this by keeping bounce rate below 2%.",
            "Add a custom tracking domain to improve deliverability and brand trust.",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm text-gray-700">
              <Shield className="h-4 w-4 text-[#6C47FF] mt-0.5 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
