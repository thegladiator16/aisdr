"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  ShieldAlert,
  Server,
  KeyRound,
  FileText,
} from "lucide-react";

type MxRecord = { exchange: string; priority: number };
type SpfInfo = {
  found: boolean;
  raw?: string;
  mechanisms?: string[];
  insecure?: boolean;
};
type DmarcInfo = { found: boolean; raw?: string; policy?: string };
type DkimInfo = { selectorsFound: { selector: string; raw: string }[] };

type CheckResult = {
  domain: string;
  mx: MxRecord[];
  spf: SpfInfo;
  dmarc: DmarcInfo;
  dkim: DkimInfo;
  scoreOutOf100: number;
  summary: string[];
};

function looksLikeDomain(input: string) {
  const v = input.trim().toLowerCase();
  if (!v) return false;
  if (/^https?:\/\//.test(v)) return false;
  if (v.includes("/") || v.includes(" ")) return false;
  if (!v.includes(".")) return false;
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    v
  );
}

function RecordCard({
  icon: Icon,
  title,
  ok,
  summary,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  ok: boolean;
  summary: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        {ok ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> OK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
            <XCircle className="h-3 w-3" /> Missing
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600">{summary}</p>
      {detail && (
        <pre className="text-[11px] leading-relaxed font-mono bg-gray-50 border border-gray-100 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all text-gray-700">
          {detail}
        </pre>
      )}
    </div>
  );
}

export function DomainCheckWidget() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const disabled = loading || !looksLikeDomain(domain);

  async function runCheck(e?: React.FormEvent) {
    e?.preventDefault();
    const value = domain.trim().toLowerCase();
    if (!looksLikeDomain(value)) {
      toast.error("Enter a domain like example.com (no protocol).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/deliverability/domain-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "Domain check failed");
        return;
      }
      const json = (await res.json()) as CheckResult;
      setResult(json);
    } catch {
      toast.error("Domain check failed");
    } finally {
      setLoading(false);
    }
  }

  const score = result?.scoreOutOf100 ?? 0;
  const ringColor =
    score >= 80
      ? "text-emerald-600 border-emerald-500"
      : score >= 40
      ? "text-amber-600 border-amber-500"
      : "text-red-600 border-red-500";
  const ringBg =
    score >= 80
      ? "bg-emerald-50"
      : score >= 40
      ? "bg-amber-50"
      : "bg-red-50";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-500" />
        <h2 className="font-semibold text-gray-900">Domain deliverability check</h2>
      </div>
      <p className="text-sm text-gray-500 -mt-3">
        Live SPF / DKIM / DMARC / MX lookup over public DNS. No account needed.
      </p>

      <form onSubmit={runCheck} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourcompany.com"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Check
        </button>
      </form>

      {result && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center gap-4">
            <div
              className={`h-20 w-20 rounded-full border-4 flex items-center justify-center ${ringColor} ${ringBg}`}
            >
              <span className="text-2xl font-bold">
                {result.scoreOutOf100}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {result.scoreOutOf100 >= 80 ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                )}
                <p className="font-semibold text-gray-900 truncate">
                  {result.domain}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Score out of 100 based on MX, SPF, DMARC and DKIM presence.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <RecordCard
              icon={Server}
              title="MX records"
              ok={result.mx.length > 0}
              summary={
                result.mx.length > 0
                  ? `${result.mx.length} mail server${result.mx.length > 1 ? "s" : ""} configured.`
                  : "No mail server configured, domain can't receive email."
              }
              detail={
                result.mx.length > 0
                  ? result.mx
                      .map((r) => `${r.priority}  ${r.exchange}`)
                      .join("\n")
                  : undefined
              }
            />
            <RecordCard
              icon={FileText}
              title="SPF"
              ok={result.spf.found}
              summary={
                result.spf.found
                  ? result.spf.insecure
                    ? "Present but uses '+all': insecure."
                    : `Present${
                        result.spf.mechanisms && result.spf.mechanisms.length
                          ? ` (${result.spf.mechanisms.length} mechanisms).`
                          : "."
                      }`
                  : "No SPF record found."
              }
              detail={result.spf.raw}
            />
            <RecordCard
              icon={ShieldCheck}
              title="DMARC"
              ok={
                result.dmarc.found &&
                result.dmarc.policy !== undefined &&
                result.dmarc.policy !== "none"
              }
              summary={
                result.dmarc.found
                  ? `Policy: p=${result.dmarc.policy ?? "unspecified"}.`
                  : "No DMARC record at _dmarc subdomain."
              }
              detail={result.dmarc.raw}
            />
            <RecordCard
              icon={KeyRound}
              title="DKIM"
              ok={result.dkim.selectorsFound.length > 0}
              summary={
                result.dkim.selectorsFound.length > 0
                  ? `Found on selector${result.dkim.selectorsFound.length > 1 ? "s" : ""}: ${result.dkim.selectorsFound
                      .map((s) => s.selector)
                      .join(", ")}.`
                  : "No DKIM found on common selectors. May use a custom selector."
              }
              detail={
                result.dkim.selectorsFound.length > 0
                  ? result.dkim.selectorsFound
                      .map(
                        (s) =>
                          `${s.selector}._domainkey\n${s.raw.slice(0, 180)}${
                            s.raw.length > 180 ? "…" : ""
                          }`
                      )
                      .join("\n\n")
                  : undefined
              }
            />
          </div>

          {result.summary.length > 0 && (
            <ul className="space-y-1 pl-1">
              {result.summary.map((s, i) => (
                <li key={i} className="text-xs text-gray-600">
                  · {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
