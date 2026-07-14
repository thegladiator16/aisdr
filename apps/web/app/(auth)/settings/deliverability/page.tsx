"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  XCircle,
  Info,
} from "lucide-react";

interface MailboxHealth {
  email: string;
  overallScore: number;
  bounceRate: number;
  openRate: number;
  replyRate: number;
  spamComplaints: number;
  recommendation: string | null;
}

interface DeliverabilityData {
  mailboxes: MailboxHealth[];
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function getScoreBarColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreBarTrack(score: number) {
  if (score >= 80) return "bg-green-100";
  if (score >= 60) return "bg-yellow-100";
  return "bg-red-100";
}

function getMetricStatus(
  metric: "bounceRate" | "openRate" | "replyRate",
  value: number
) {
  switch (metric) {
    case "bounceRate":
      if (value <= 2) return { label: "Healthy", color: "text-green-600" };
      if (value <= 5) return { label: "Fair", color: "text-yellow-600" };
      return { label: "High", color: "text-red-600" };
    case "openRate":
      if (value >= 50) return { label: "Excellent", color: "text-green-600" };
      if (value >= 30) return { label: "Fair", color: "text-yellow-600" };
      return { label: "Low", color: "text-red-600" };
    case "replyRate":
      if (value >= 10) return { label: "Strong", color: "text-green-600" };
      if (value >= 5) return { label: "Fair", color: "text-yellow-600" };
      return { label: "Low", color: "text-red-600" };
  }
}

export default function DeliverabilityPage() {
  const [data, setData] = useState<DeliverabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deliverability");
      if (!res.ok) throw new Error("Failed to fetch deliverability data");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load deliverability data"
      );
    } finally {
      setLoading(false);
    }
  }

  const mailboxes = data?.mailboxes ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliverability</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor your email sending reputation and health.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-100" />
                  <div className="h-3 w-32 rounded bg-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-20 rounded-lg bg-gray-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && mailboxes.length === 0 && !error && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <BarChart3 className="h-6 w-6 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                No deliverability data yet
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Deliverability metrics will appear here once you start sending
                emails through your connected Gmail accounts. Connect a
                mailbox and begin outreach to see your sender reputation
                stats.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Per-mailbox health cards */}
      {!loading &&
        mailboxes.map((mb) => (
          <div
            key={mb.email}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          >
            {/* Critical alert banner */}
            {mb.overallScore < 30 && (
              <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 px-6 py-3">
                <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm font-medium text-red-700">
                  Critical: Sender reputation is severely degraded. Pause
                  outreach and investigate spam complaints.
                </p>
              </div>
            )}

            {/* Warning banner */}
            {mb.overallScore >= 30 && mb.overallScore < 60 && (
              <div className="flex items-center gap-2 bg-yellow-50 border-b border-yellow-200 px-6 py-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                <p className="text-sm font-medium text-yellow-700">
                  Warning: Deliverability is below acceptable levels. Review
                  bounce rate and spam complaints.
                </p>
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Header with score */}
              <div className="flex items-center gap-5">
                <div
                  className={`flex items-center justify-center h-16 w-16 rounded-xl border-2 ${getScoreBg(mb.overallScore)}`}
                >
                  <span
                    className={`text-2xl font-bold ${getScoreColor(mb.overallScore)}`}
                  >
                    {mb.overallScore}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {mb.email}
                    </h3>
                    {mb.overallScore >= 80 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Healthy
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Overall sender reputation score
                  </p>
                </div>
              </div>

              {/* Overall score bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    Health score
                  </span>
                  <span
                    className={`text-xs font-bold ${getScoreColor(mb.overallScore)}`}
                  >
                    {mb.overallScore}/100
                  </span>
                </div>
                <div
                  className={`h-2.5 w-full rounded-full ${getScoreBarTrack(mb.overallScore)}`}
                >
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${getScoreBarColor(mb.overallScore)}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, mb.overallScore))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Bounce Rate */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      Bounce rate
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {mb.bounceRate.toFixed(1)}%
                  </p>
                  <p
                    className={`text-xs font-medium ${getMetricStatus("bounceRate", mb.bounceRate).color}`}
                  >
                    {getMetricStatus("bounceRate", mb.bounceRate).label}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        mb.bounceRate <= 2
                          ? "bg-green-500"
                          : mb.bounceRate <= 5
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(100, mb.bounceRate * 10)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Open Rate */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      Open rate
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {mb.openRate.toFixed(1)}%
                  </p>
                  <p
                    className={`text-xs font-medium ${getMetricStatus("openRate", mb.openRate).color}`}
                  >
                    {getMetricStatus("openRate", mb.openRate).label}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, mb.openRate)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Reply Rate */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      Reply rate
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {mb.replyRate.toFixed(1)}%
                  </p>
                  <p
                    className={`text-xs font-medium ${getMetricStatus("replyRate", mb.replyRate).color}`}
                  >
                    {getMetricStatus("replyRate", mb.replyRate).label}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-violet-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, mb.replyRate * 5)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Spam Complaints */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      Spam reports
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {mb.spamComplaints}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      mb.spamComplaints === 0
                        ? "text-green-600"
                        : mb.spamComplaints <= 3
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {mb.spamComplaints === 0
                      ? "None"
                      : mb.spamComplaints <= 3
                        ? "Needs attention"
                        : "Critical"}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        mb.spamComplaints === 0
                          ? "bg-green-500"
                          : mb.spamComplaints <= 3
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(100, mb.spamComplaints * 10)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              {mb.recommendation && (
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <Info className="h-4 w-4 text-[#6C47FF] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Recommendation
                    </h4>
                    <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                      {mb.recommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

      {/* General tips card */}
      {!loading && mailboxes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            Deliverability best practices
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                Keep bounce rates below 2% by verifying email addresses before
                sending.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                Aim for 50%+ open rates by writing compelling, personalized
                subject lines.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                Maintain 5%+ reply rates by targeting the right audience with
                relevant messaging.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                Use email warmup for new accounts to build sender reputation
                gradually.
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
