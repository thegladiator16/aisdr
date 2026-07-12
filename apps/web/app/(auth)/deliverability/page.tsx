"use client";

import { useState, useEffect } from "react";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Mail,
  ArrowDown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { MailboxHealthWidget } from "./MailboxHealthWidget";
import { DomainCheckWidget } from "./DomainCheckWidget";
import { toast } from "sonner";

type DnsRecord = {
  name: string;
  desc: string;
  status: "pass" | "warn" | "fail" | "unknown";
  detail?: string;
};

type DomainResult = {
  scoreOutOf100: number;
  spfFound: boolean;
  dmarcPolicy: string | null;
  dkimFound: boolean;
  mxFound: boolean;
};

function StatusBadge({ status }: { status: "pass" | "warn" | "fail" | "unknown" }) {
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
  if (status === "fail")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
        <XCircle className="h-3 w-3" /> Not set
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      <Loader2 className="h-3 w-3 animate-spin" /> Checking
    </span>
  );
}

function gradeFromScore(score: number) {
  if (score >= 90) return { letter: "A+", color: "text-emerald-600 bg-emerald-50" };
  if (score >= 75) return { letter: "A", color: "text-emerald-600 bg-emerald-50" };
  if (score >= 60) return { letter: "B", color: "text-violet-600 bg-violet-50" };
  if (score >= 40) return { letter: "C", color: "text-amber-600 bg-amber-50" };
  return { letter: "D", color: "text-red-600 bg-red-50" };
}

function buildRecommendations(domain: DomainResult | null): string[] {
  if (!domain) return [
    "Set a DMARC policy to 'quarantine' or 'reject' to improve trust with receiving servers.",
    "Keep daily send volume under 50 emails during the first 2 weeks of warmup.",
    "Add a custom tracking domain to improve deliverability and brand trust.",
    "Run a domain check below to see your SPF, DKIM, and DMARC status.",
  ];
  const tips: string[] = [];
  if (!domain.dmarcPolicy || domain.dmarcPolicy === "none")
    tips.push("Set your DMARC policy to 'quarantine' or 'reject' — your current policy doesn't protect against spoofing.");
  else if (domain.dmarcPolicy === "quarantine")
    tips.push("DMARC is set to 'quarantine'. Consider tightening to 'reject' for maximum protection.");
  if (!domain.spfFound)
    tips.push("No SPF record found. Add an SPF record to authorize your sending servers.");
  if (!domain.dkimFound)
    tips.push("No DKIM found on common selectors. Enable DKIM signing in your email provider settings.");
  if (!domain.mxFound)
    tips.push("No MX records detected. This domain can't receive replies — set up MX records.");
  if (domain.scoreOutOf100 >= 75)
    tips.push("Your domain health looks good! Keep bounce rate below 2% to maintain high inbox placement.");
  tips.push("Keep daily send volume under 50 emails during the first 2 weeks of warmup.");
  return tips.slice(0, 4);
}

export default function DeliverabilityPage() {
  const [domainResult, setDomainResult] = useState<DomainResult | null>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [checkedDomain, setCheckedDomain] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([
    { name: "SPF Record", desc: "Authorizes which servers can send email for your domain", status: "unknown" },
    { name: "DKIM Signing", desc: "Cryptographic signature that verifies email authenticity", status: "unknown" },
    { name: "DMARC Policy", desc: "Tells receiving servers how to handle unauthenticated mail", status: "unknown" },
  ]);

  // Try to auto-detect domain from connected mailbox
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/integrations/status");
        if (!res.ok) return;
        const json = await res.json();
        const gmail = json?.gmail;
        if (gmail?.connected && gmail?.email) {
          const domain = gmail.email.split("@")[1];
          if (domain) autoCheckDomain(domain);
        }
      } catch { /* soft-fail */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function autoCheckDomain(domain: string) {
    setCheckingDomain(true);
    setCheckedDomain(domain);
    try {
      const res = await fetch("/api/deliverability/domain-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setDomainResult({
        scoreOutOf100: data.scoreOutOf100,
        spfFound: data.spf?.found ?? false,
        dmarcPolicy: data.dmarc?.policy ?? null,
        dkimFound: (data.dkim?.selectorsFound?.length ?? 0) > 0,
        mxFound: (data.mx?.length ?? 0) > 0,
      });
      setDnsRecords([
        {
          name: "SPF Record",
          desc: "Authorizes which servers can send email for your domain",
          status: data.spf?.found ? (data.spf?.insecure ? "warn" : "pass") : "fail",
          detail: data.spf?.raw,
        },
        {
          name: "DKIM Signing",
          desc: "Cryptographic signature that verifies email authenticity",
          status: (data.dkim?.selectorsFound?.length ?? 0) > 0 ? "pass" : "warn",
          detail: data.dkim?.selectorsFound?.[0]?.raw,
        },
        {
          name: "DMARC Policy",
          desc: "Tells receiving servers how to handle unauthenticated mail",
          status: !data.dmarc?.found ? "fail" : data.dmarc?.policy === "none" || !data.dmarc?.policy ? "warn" : "pass",
          detail: data.dmarc?.raw,
        },
      ]);
    } catch { /* soft-fail */ }
    finally { setCheckingDomain(false); }
  }

  const grade = domainResult ? gradeFromScore(domainResult.scoreOutOf100) : null;
  const recommendations = buildRecommendations(domainResult);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliverability</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor your email health and inbox placement
          </p>
        </div>
        {checkedDomain && (
          <button
            onClick={() => autoCheckDomain(checkedDomain)}
            disabled={checkingDomain}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {checkingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh {checkedDomain}
          </button>
        )}
      </div>

      <MailboxHealthWidget />

      {/* Domain Health Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-6">
        {grade ? (
          <div className={`h-20 w-20 rounded-2xl flex items-center justify-center shrink-0 ${grade.color}`}>
            <span className="text-3xl font-bold">{grade.letter}</span>
          </div>
        ) : (
          <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
            {checkingDomain ? (
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            ) : (
              <Shield className="h-8 w-8 text-gray-400" />
            )}
          </div>
        )}
        <div>
          <h2 className="font-semibold text-gray-900">Domain Health Score</h2>
          {domainResult ? (
            <p className="text-sm text-gray-500 mt-1">
              {checkedDomain} scored <strong>{domainResult.scoreOutOf100}/100</strong> on DNS health checks.
              {domainResult.scoreOutOf100 >= 75 ? " All major records are properly set up." : " Some records need attention — see below."}
            </p>
          ) : checkingDomain ? (
            <p className="text-sm text-gray-500 mt-1">Checking DNS records for {checkedDomain}…</p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Connect your Gmail mailbox in Settings → Integrations and we'll auto-check your domain.
              Or use the checker below to scan any domain.
            </p>
          )}
        </div>
      </div>

      {/* DNS Records */}
      <div className="grid md:grid-cols-3 gap-4">
        {dnsRecords.map(({ name, desc, status, detail }) => (
          <div key={name} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">{name}</h3>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-gray-500">{desc}</p>
            {detail && (
              <pre className="text-[11px] font-mono bg-gray-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all text-gray-600 border border-gray-100">
                {detail.slice(0, 120)}{detail.length > 120 ? "…" : ""}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Metrics — shown as benchmarks when domain not checked */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          {
            label: "Inbox Placement",
            value: domainResult?.scoreOutOf100 ? `${Math.min(99, Math.round(domainResult.scoreOutOf100 * 0.95))}%` : "—",
            sub: domainResult ? "Estimated" : "Connect mailbox to track",
            icon: Mail,
            color: "text-violet-600 bg-violet-50",
          },
          {
            label: "Bounce Rate",
            value: "—",
            sub: "Tracked after sending",
            icon: ArrowDown,
            color: "text-violet-600 bg-violet-50",
          },
          {
            label: "Unsubscribe Rate",
            value: "—",
            sub: "Tracked after sending",
            icon: XCircle,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "Warmup Progress",
            value: "—",
            sub: "Start warmup in Settings",
            icon: TrendingUp,
            color: "text-violet-600 bg-violet-50",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className={`h-10 w-10 rounded-lg ${color.split(" ")[1]} flex items-center justify-center mb-3`}>
              <Icon className={`h-5 w-5 ${color.split(" ")[0]}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Arya's Recommendations */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AryaAvatar size="sm" />
          <h2 className="font-semibold text-gray-900">Arya&apos;s Recommendations</h2>
          {domainResult && <span className="text-xs text-violet-600 font-medium bg-violet-100 px-2 py-0.5 rounded-full">Based on {checkedDomain}</span>}
        </div>
        <ul className="space-y-3">
          {recommendations.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Shield className="h-4 w-4 text-[#6C47FF] mt-0.5 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <DomainCheckWidget />
    </div>
  );
}
