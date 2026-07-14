"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Play,
  Pause,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  RefreshCw,
  Info,
} from "lucide-react";

interface WarmupSession {
  id: string;
  email: string;
  status: "active" | "paused" | "complete";
  healthScore: number;
  emailsSentToday: number;
  dailyLimit: number;
  daysActive: number;
  estimatedDaysRemaining: number;
  startedAt: string;
}

function getHealthBarColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getHealthBarTrack(score: number) {
  if (score >= 80) return "bg-green-100";
  if (score >= 60) return "bg-yellow-100";
  return "bg-red-100";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-green-50 text-green-700 border border-green-200",
      };
    case "paused":
      return {
        label: "Paused",
        className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      };
    case "complete":
      return {
        label: "Complete",
        className: "bg-blue-50 text-blue-700 border border-blue-200",
      };
    default:
      return {
        label: status,
        className: "bg-gray-50 text-gray-700 border border-gray-200",
      };
  }
}

export default function MailboxesPage() {
  const [sessions, setSessions] = useState<WarmupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/warmup/status");
      if (!res.ok) throw new Error("Failed to fetch warmup status");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load warmup data");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWarmup(email: string, action: "start" | "stop") {
    setActionLoading(email);
    try {
      const res = await fetch(`/api/warmup/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmailAccount: email }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} warmup`);
      await fetchSessions();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : `Failed to ${action} warmup`
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mailboxes &amp; Warmup
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Warm up your Gmail accounts for better deliverability.
          </p>
        </div>
        <button
          onClick={fetchSessions}
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

      {/* Warmup explanation card */}
      {!loading && sessions.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-violet-50 p-3">
              <Flame className="h-6 w-6 text-[#6C47FF]" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-base font-semibold text-gray-900">
                What is email warmup?
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Email warmup gradually increases your sending volume over
                several weeks. Automated conversations between your account
                and a pool of real mailboxes build sender reputation, keeping
                your outreach out of the spam folder.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 mt-3">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-gray-400" />
                  How it works
                </h3>
                <ul className="text-sm text-gray-600 space-y-1.5 ml-6">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">1.</span>
                    <span>
                      Connect your Gmail account via the Integrations page.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">2.</span>
                    <span>
                      Start warmup to begin automated sending between pool
                      accounts.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">3.</span>
                    <span>
                      Daily volume ramps up gradually over 2-4 weeks until
                      your account reaches full capacity.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center gap-2 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  Requires the{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-xs font-mono">
                    WARMUP_POOL_EMAILS
                  </code>{" "}
                  environment variable to be configured.
                </p>
              </div>
            </div>
          </div>
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
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-100" />
                  <div className="h-3 w-32 rounded bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mailbox cards */}
      {!loading && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => {
            const badge = getStatusBadge(session.status);
            const isExpanded = expandedId === session.id;
            const isThisLoading = actionLoading === session.email;

            return (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-gray-50 p-2.5 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {session.email}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {session.status === "active" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {session.status === "paused" && (
                            <Pause className="h-3 w-3" />
                          )}
                          {session.status === "complete" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Warming up for {session.daysActive} day
                        {session.daysActive !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Health score bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">
                        Health score
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          session.healthScore >= 80
                            ? "text-green-600"
                            : session.healthScore >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {session.healthScore}/100
                      </span>
                    </div>
                    <div
                      className={`h-2 w-full rounded-full ${getHealthBarTrack(session.healthScore)}`}
                    >
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getHealthBarColor(session.healthScore)}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, session.healthScore))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center rounded-lg bg-gray-50 px-3 py-2.5">
                      <p className="text-sm font-bold text-gray-900">
                        {session.emailsSentToday}/{session.dailyLimit}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sent today
                      </p>
                    </div>
                    <div className="text-center rounded-lg bg-gray-50 px-3 py-2.5">
                      <p className="text-sm font-bold text-gray-900">
                        {session.daysActive}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Days active
                      </p>
                    </div>
                    <div className="text-center rounded-lg bg-gray-50 px-3 py-2.5">
                      <p className="text-sm font-bold text-gray-900">
                        {session.status === "complete"
                          ? "Done"
                          : `~${session.estimatedDaysRemaining}d`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Est. remaining
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    {session.status === "active" ? (
                      <button
                        onClick={() => toggleWarmup(session.email, "stop")}
                        disabled={isThisLoading}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <Pause className="h-4 w-4" />
                        {isThisLoading ? "Pausing..." : "Pause Warmup"}
                      </button>
                    ) : session.status === "paused" ? (
                      <button
                        onClick={() => toggleWarmup(session.email, "start")}
                        disabled={isThisLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" />
                        {isThisLoading ? "Starting..." : "Resume Warmup"}
                      </button>
                    ) : null}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : session.id)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View Details
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      Warmup details
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2">
                        <span className="text-gray-500">Started</span>
                        <span className="font-medium text-gray-900">
                          {new Date(session.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2">
                        <span className="text-gray-500">Daily limit</span>
                        <span className="font-medium text-gray-900">
                          {session.dailyLimit} emails
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2">
                        <span className="text-gray-500">Status</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {session.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2">
                        <span className="text-gray-500">Health</span>
                        <span
                          className={`font-medium ${
                            session.healthScore >= 80
                              ? "text-green-600"
                              : session.healthScore >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {session.healthScore}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-white border border-gray-100 p-3">
                      <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Sending volume increases daily based on your health
                        score. A score above 80 indicates your account is
                        building strong sender reputation. Scores below 60
                        may indicate deliverability issues.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
