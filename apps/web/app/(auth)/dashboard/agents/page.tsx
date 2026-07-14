"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  ChevronRight,
  CircleX,
  Loader2,
  Sparkles,
  AlertTriangle,
  Mail,
  Building2,
  ChevronDown,
  Zap,
  ArrowRight,
} from "lucide-react";
import { AutonomousRunLauncher } from "@/components/agents/AutonomousRunLauncher";

/* ---------- Types ---------- */

interface SampleLead {
  name: string;
  title: string;
  company: string;
  email: string | null;
  confidence: number | null;
}

interface RunOutput {
  plan?: string[];
  leadCount?: number;
  emailCount?: number;
  firstSendAt?: string | null;
  leadSource?: string;
  creditsUsed?: number;
  creditBreakdown?: Record<string, number>;
  sampleLeads?: SampleLead[];
  [key: string]: unknown;
}

interface Run {
  id: string;
  status: string;
  goal: string;
  campaignId: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  output: RunOutput | null;
}

interface Task {
  id: string;
  agentName: string;
  status: string;
  sequence: number;
  startedAt: string;
  completedAt: string | null;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
}

interface LogRow {
  id: string;
  taskId: string;
  level: string;
  message: string;
  createdAt: string;
}

interface RunDetail {
  run: Run;
  tasks: Task[];
  logs: LogRow[];
}

/* ---------- Agent pipeline config ---------- */

const AGENT_PIPELINE = [
  { key: "orchestrator", label: "Orchestrator", emoji: "🧠" },
  { key: "prospecting",  label: "Prospecting",  emoji: "🔍" },
  { key: "research",     label: "Research",     emoji: "📊" },
  { key: "copywriter",   label: "Copywriter",   emoji: "✍️" },
  { key: "sender",       label: "Sender",       emoji: "📤" },
] as const;

/* ---------- Helpers ---------- */

function durationStr(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "In progress";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function getTaskMetric(agentName: string, output: Record<string, unknown> | null): string {
  if (!output) return "";
  switch (agentName) {
    case "orchestrator": {
      const plan = output.plan as string[] | undefined;
      return plan?.length ? `${plan.length}-step plan` : "Planning complete";
    }
    case "prospecting": {
      const count = output.count as number | undefined;
      const source = output.source as string | undefined;
      if (count == null) return "";
      return `${count} lead${count !== 1 ? "s" : ""} ${source === "hunter" ? "· verified" : "· demo"}`;
    }
    case "research": {
      const count = output.count as number | undefined;
      const web = output.webGrounded as number | undefined;
      if (count == null) return "";
      return `${count} researched${web ? ` · ${web} web` : ""}`;
    }
    case "copywriter": {
      const count = output.count as number | undefined;
      if (count == null) return "";
      return `${count} email${count !== 1 ? "s" : ""} written`;
    }
    case "sender": {
      const delivered = output.delivered as number | undefined;
      const reason = output.skippedReason as string | undefined;
      if (reason === "gmail_not_connected") return "Not sent";
      if (delivered == null) return "";
      return `${delivered} delivered`;
    }
    default: return "";
  }
}

type Warning = { type: "warning" | "tip"; message: string; link?: string };

function getWarnings(tasks: Task[]): Warning[] {
  const out: Warning[] = [];
  for (const t of tasks) {
    if (t.agentName === "prospecting" && t.output?.source === "synthesized") {
      out.push({
        type: "warning",
        message: "Hunter.io not connected — using synthesised demo leads (no real emails).",
        link: "/dashboard/settings",
      });
    }
    if (t.agentName === "research" && t.output?.serperConfigured === false) {
      out.push({
        type: "tip",
        message: "Add SERPER_API_KEY to unlock real web research and grounded personalisation.",
      });
    }
    if (t.agentName === "sender" && t.output?.skippedReason === "gmail_not_connected") {
      out.push({
        type: "warning",
        message: "Gmail not connected — emails were scheduled but not delivered.",
        link: "/dashboard/settings/integrations",
      });
    }
  }
  return out;
}

/* ---------- Sub-components ---------- */

function StatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const cfg: Record<string, { ring: string; text: string; dot: string }> = {
    completed: { ring: "ring-emerald-200 bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    running:   { ring: "ring-violet-200 bg-violet-50",   text: "text-violet-700",  dot: "bg-violet-500"  },
    failed:    { ring: "ring-red-200 bg-red-50",         text: "text-red-700",     dot: "bg-red-500"     },
    pending:   { ring: "ring-gray-200 bg-gray-50",       text: "text-gray-500",    dot: "bg-gray-400"    },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-semibold capitalize shrink-0
        ${c.ring} ${c.text} ${large ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"}`}
    >
      {status === "running" ? (
        <Loader2 className={large ? "h-3.5 w-3.5 animate-spin" : "h-3 w-3 animate-spin"} />
      ) : (
        <span className={`rounded-full inline-block ${c.dot} ${large ? "h-2 w-2" : "h-1.5 w-1.5"}`} />
      )}
      {status}
    </span>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-center">
      <div className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">{label}</div>
      <div className="text-sm font-bold text-gray-900 mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function AgentCard({
  config,
  task,
  logs,
}: {
  config: { key: string; label: string; emoji: string };
  task: Task | undefined;
  logs: LogRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const metric = task ? getTaskMetric(config.key, task.output) : "";
  const dur = task ? durationStr(task.startedAt, task.completedAt) : null;

  const border: Record<string, string> = {
    completed: "border-emerald-200 bg-emerald-50/40",
    running:   "border-violet-300 bg-violet-50/40",
    failed:    "border-red-200 bg-red-50/40",
  };
  const dot: Record<string, string> = {
    completed: "bg-emerald-500",
    running:   "bg-violet-500 animate-pulse",
    failed:    "bg-red-500",
  };
  const borderCls = task ? (border[task.status] ?? "border-gray-200 bg-gray-50/30") : "border-gray-100 bg-gray-50/20";
  const dotCls    = task ? (dot[task.status]    ?? "bg-gray-300")                   : "bg-gray-200";

  return (
    <div className={`rounded-xl border ${borderCls} p-2.5 flex flex-col gap-1.5 h-full`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base leading-none shrink-0">{config.emoji}</span>
          <span className="text-[11px] font-semibold text-gray-800 truncate">{config.label}</span>
        </div>
        <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${dotCls}`} />
      </div>

      {/* Metric */}
      {metric && (
        <div className="text-[10px] text-gray-500 leading-tight">{metric}</div>
      )}

      {/* Duration */}
      {dur && dur !== "In progress" && dur !== "—" && (
        <div className="text-[9px] text-gray-400">{dur}</div>
      )}

      {/* Error */}
      {task?.errorMessage && (
        <p className="text-[9px] text-red-600 bg-red-50 rounded px-1.5 py-1 border border-red-100 leading-tight">
          {task.errorMessage.slice(0, 80)}
        </p>
      )}

      {/* Expand logs */}
      {logs.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-gray-600 transition-colors self-start mt-auto"
          >
            <ChevronDown
              className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {logs.length} log{logs.length !== 1 ? "s" : ""}
          </button>

          {expanded && (
            <div className="rounded-lg bg-gray-900 p-2 space-y-1 max-h-36 overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="flex gap-1 text-[9px] leading-relaxed">
                  <span className="text-gray-600 shrink-0">›</span>
                  <span className={l.level === "error" ? "text-red-400" : "text-gray-300"}>
                    {l.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: SampleLead }) {
  const initials = lead.name
    ? lead.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2 hover:border-violet-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2.5">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{lead.name || "Unknown"}</div>
          <div className="text-xs text-gray-500 truncate">{lead.title || "—"}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
          <span className="truncate">{lead.company || "—"}</span>
        </div>
        {lead.email ? (
          <div className="flex items-center gap-1.5 text-xs">
            <Mail className="h-3 w-3 text-violet-400 shrink-0" />
            <span className="truncate text-violet-700 font-medium">{lead.email}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Mail className="h-3 w-3 shrink-0" />
            <span>No email · demo mode</span>
          </div>
        )}
        {lead.confidence != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(lead.confidence, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 shrink-0 font-medium">{lead.confidence}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Run detail panel ---------- */

function RunDetailPanel({ detail }: { detail: RunDetail }) {
  const { run, tasks, logs } = detail;
  const output = run.output;
  const plan = output?.plan;
  const sampleLeads = output?.sampleLeads;
  const warnings = getWarnings(tasks);
  const totalDur = durationStr(run.startedAt, run.completedAt);

  // Sender stats
  const senderTask = tasks.find((t) => t.agentName === "sender");
  const sOut = senderTask?.output;
  const delivered    = sOut?.delivered    as number | undefined;
  const failedSend   = sOut?.failed       as number | undefined;
  const skippedEmail = sOut?.skippedNoEmail as number | undefined;
  const gmailAccount = sOut?.gmailAccount as string | undefined;
  const showDelivery = delivered != null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <StatusBadge status={run.status} large />
          <p className="text-base font-semibold text-gray-900 leading-snug pt-0.5">{run.goal}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            label="Started"
            value={new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            sub={new Date(run.startedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
          />
          <MetricCard label="Duration" value={totalDur} />
          {output?.creditsUsed != null ? (
            <MetricCard label="Credits used" value={String(output.creditsUsed)} />
          ) : (
            <MetricCard label="Leads" value={String(output?.leadCount ?? "—")} />
          )}
        </div>

        {run.errorMessage && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 flex items-start gap-2">
            <CircleX className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{run.errorMessage}</span>
          </div>
        )}
      </div>

      {/* ── Agent pipeline ── */}
      <div>
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
          Agent Pipeline
        </h3>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {AGENT_PIPELINE.map((cfg, i) => {
            const task = tasks.find((t) => t.agentName === cfg.key);
            const taskLogs = task ? logs.filter((l) => l.taskId === task.id) : [];
            return (
              <div key={cfg.key} className="flex items-start shrink-0">
                <div className="w-[120px]">
                  <AgentCard config={cfg} task={task} logs={taskLogs} />
                </div>
                {i < AGENT_PIPELINE.length - 1 && (
                  <div className="flex items-center mt-4 px-0.5">
                    <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 text-xs ${
                w.type === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {w.type === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : (
                <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-relaxed">{w.message}</span>
              {w.link && (
                <a href={w.link} className="underline font-semibold shrink-0 whitespace-nowrap">
                  Fix →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Credits breakdown ── */}
      {output?.creditBreakdown && Object.keys(output.creditBreakdown).length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-white border border-violet-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-violet-600 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> Credits used
            </h3>
            <span className="text-2xl font-extrabold text-violet-800 leading-none">
              {output.creditsUsed ?? 0}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(output.creditBreakdown).map(([agent, credits]) => (
              <div
                key={agent}
                className="flex items-center justify-between bg-white/80 rounded-lg px-2.5 py-2 border border-violet-100/60"
              >
                <span className="text-xs text-gray-600 capitalize">{agent}</span>
                <span className="text-xs font-bold text-violet-700">{credits}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action plan ── */}
      {plan && plan.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
            Action Plan
          </h3>
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2.5">
            {plan.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-gray-700 leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Leads ── */}
      {sampleLeads && sampleLeads.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
            Leads{output?.leadCount != null ? ` (${output.leadCount})` : ""}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sampleLeads.map((lead, i) => (
              <LeadCard key={i} lead={lead} />
            ))}
          </div>
          {output?.leadCount != null && sampleLeads.length < output.leadCount && (
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              Showing {sampleLeads.length} of {output.leadCount} leads
            </p>
          )}
        </div>
      )}

      {/* ── Delivery summary ── */}
      {showDelivery && (
        <div>
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
            Delivery
          </h3>
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-extrabold text-emerald-600">{delivered}</div>
                <div className="text-[10px] text-gray-500 mt-1 font-medium">Sent</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-red-400">{failedSend ?? 0}</div>
                <div className="text-[10px] text-gray-500 mt-1 font-medium">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-300">{skippedEmail ?? 0}</div>
                <div className="text-[10px] text-gray-500 mt-1 font-medium">Skipped</div>
              </div>
            </div>
            {gmailAccount && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-400 justify-center border-t border-gray-100 pt-3">
                <Mail className="h-3 w-3" />
                <span>via {gmailAccount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Main page ---------- */

export default function AgentsDashboard() {
  const params = useSearchParams();
  const activeRunFromUrl = params.get("run");
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(activeRunFromUrl);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/runs", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setRuns(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedRunIdRef = useRef(selectedRunId);
  const runsRef = useRef(runs);
  useEffect(() => { selectedRunIdRef.current = selectedRunId; }, [selectedRunId]);
  useEffect(() => { runsRef.current = runs; }, [runs]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/agents/runs/${id}`, { cache: "no-store" });
      if (!res.ok) { setDetail(null); return; }
      const json = await res.json();
      setDetail(json.data as RunDetail);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
    const iv = setInterval(() => {
      const hasLive = runsRef.current.some(
        (r) => r.status === "running" || r.status === "pending"
      );
      if (hasLive) {
        loadRuns();
        const rid = selectedRunIdRef.current;
        if (rid) loadDetail(rid);
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [loadRuns, loadDetail]);

  useEffect(() => {
    if (selectedRunId) {
      setDetail(null);
      loadDetail(selectedRunId);
    }
  }, [selectedRunId, loadDetail]);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-violet-600" />
            Agents
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Multi-agent autonomous mode — orchestrator, prospecting, research, copywriter, sender.
          </p>
        </div>
      </div>

      <AutonomousRunLauncher />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_2fr] gap-4 items-start">
        {/* ── Runs list ── */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent runs</h2>
            <span className="text-xs text-gray-400">{runs.length}</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : runs.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                <Sparkles className="h-8 w-8 text-violet-300 mx-auto mb-2" />
                No runs yet — launch Arya above.
              </div>
            ) : (
              runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-violet-50/40 transition-colors flex items-start gap-3 ${
                    selectedRunId === r.id ? "bg-violet-50/70 border-l-2 border-violet-400" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={r.status} />
                      <span className="text-[11px] text-gray-400 truncate">
                        {new Date(r.startedAt).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 truncate font-medium">{r.goal}</p>
                    {r.status === "completed" && r.output?.creditsUsed != null && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-violet-600 font-semibold flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" />
                          {r.output.creditsUsed} credits
                        </span>
                        {r.output.leadCount != null && (
                          <span className="text-[10px] text-gray-400">
                            · {r.output.leadCount} leads
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Run detail ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {!selectedRunId ? (
            <div className="text-center py-20 text-sm text-gray-400">
              <Bot className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              Select a run to view its agent trace and results.
            </div>
          ) : detailLoading && !detail ? (
            <div className="text-center py-20 text-sm text-gray-400 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-violet-300 animate-spin" />
              Loading agent trace…
            </div>
          ) : detail ? (
            <RunDetailPanel detail={detail} />
          ) : (
            <div className="text-center py-20 text-sm text-gray-400">
              Run not found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
