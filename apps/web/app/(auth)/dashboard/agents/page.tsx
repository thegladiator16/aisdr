"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertTriangle,
  Mail,
  Building2,
  ChevronDown,
  Zap,
  Clock,
  Users,
  Search,
  BarChart3,
  PenLine,
  Send,
  Check,
  X,
  Minus,
  Info,
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

const AGENT_PIPELINE: {
  key: string;
  label: string;
  icon: typeof Bot;
}[] = [
  { key: "orchestrator", label: "Orchestrator", icon: Bot },
  { key: "prospecting",  label: "Prospecting",  icon: Search },
  { key: "research",     label: "Research",      icon: BarChart3 },
  { key: "copywriter",   label: "Copywriter",    icon: PenLine },
  { key: "sender",       label: "Sender",        icon: Send },
];

/* ---------- Helpers ---------- */

function durationStr(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "-";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "-";
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function getTaskMetric(agentName: string, output: Record<string, unknown> | null): string | null {
  if (!output) return null;
  switch (agentName) {
    case "orchestrator": {
      const plan = output.plan as string[] | undefined;
      return plan?.length ? `${plan.length} steps` : null;
    }
    case "prospecting": {
      const count = output.count as number | undefined;
      const source = output.source as string | undefined;
      if (count == null) return null;
      return `${count} lead${count !== 1 ? "s" : ""}${source === "hunter" ? " (verified)" : ""}`;
    }
    case "research": {
      const count = output.count as number | undefined;
      const web = output.webGrounded as number | undefined;
      if (count == null) return null;
      return `${count} enriched${web ? `, ${web} from web` : ""}`;
    }
    case "copywriter": {
      const count = output.count as number | undefined;
      if (count == null) return null;
      return `${count} email${count !== 1 ? "s" : ""} drafted`;
    }
    case "sender": {
      const delivered = output.delivered as number | undefined;
      const reason = output.skippedReason as string | undefined;
      if (reason === "gmail_not_connected") return "Gmail not connected";
      if (delivered == null) return null;
      return `${delivered} sent`;
    }
    default:
      return null;
  }
}

type Warning = { type: "warning" | "info"; message: string; action?: string; link?: string };

function getWarnings(tasks: Task[]): Warning[] {
  const out: Warning[] = [];
  for (const t of tasks) {
    if (t.agentName === "prospecting" && t.output?.source === "synthesized") {
      out.push({
        type: "info",
        message: "This run used synthesised demo leads, Hunter.io was not configured at the time.",
      });
    }
    if (t.agentName === "research" && t.output?.serperConfigured === false) {
      out.push({
        type: "info",
        message: "This run did not use web research, Serper was not configured at the time.",
      });
    }
    if (t.agentName === "sender" && t.output?.skippedReason === "gmail_not_connected") {
      out.push({
        type: "info",
        message: "Emails were scheduled but not delivered, Gmail was not connected at the time.",
      });
    }
  }
  return out;
}

/* ---------- Sub-components ---------- */

function StatusDot({ status, size = 6 }: { status: string; size?: number }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500",
    running:   "bg-violet-500",
    failed:    "bg-red-500",
    pending:   "bg-gray-300",
  };
  if (status === "running") {
    return (
      <span className="relative flex shrink-0" style={{ width: size, height: size }}>
        <span
          className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-40"
          style={{ width: size, height: size }}
        />
        <span
          className="relative rounded-full bg-violet-500"
          style={{ width: size, height: size }}
        />
      </span>
    );
  }
  return (
    <span
      className={`rounded-full shrink-0 ${colors[status] ?? "bg-gray-300"}`}
      style={{ width: size, height: size }}
    />
  );
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    running:   "bg-violet-500/10 text-violet-700 border-violet-500/20",
    failed:    "bg-red-500/10 text-red-700 border-red-500/20",
    pending:   "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${
        map[status] ?? map.pending
      }`}
    >
      <StatusDot status={status} size={5} />
      {status}
    </span>
  );
}

/* ---------- Pipeline step ---------- */

function PipelineStep({
  config,
  task,
  taskLogs,
  isLast,
}: {
  config: (typeof AGENT_PIPELINE)[number];
  task: Task | undefined;
  taskLogs: LogRow[];
  isLast: boolean;
}) {
  const [logsOpen, setLogsOpen] = useState(false);
  const metric = task ? getTaskMetric(config.key, task.output) : null;
  const dur = task ? durationStr(task.startedAt, task.completedAt) : null;
  const Icon = config.icon;

  const status = task?.status ?? "pending";

  const iconBg: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600",
    running:   "bg-violet-500/10 text-violet-600",
    failed:    "bg-red-500/10 text-red-600",
    pending:   "bg-gray-100 text-gray-400",
  };

  return (
    <div className="flex gap-3">
      {/* Timeline rail */}
      <div className="flex flex-col items-center pt-0.5">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
            iconBg[status] ?? iconBg.pending
          }`}
        >
          {status === "running" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 mt-1.5 mb-0 ${
              status === "completed"
                ? "bg-emerald-200"
                : status === "failed"
                ? "bg-red-200"
                : "bg-gray-200"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-4"}`}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-gray-900">{config.label}</span>
          {dur && dur !== "-" && (
            <span className="text-[11px] text-gray-400 tabular-nums">{dur}</span>
          )}
          {status === "completed" && (
            <Check className="h-3 w-3 text-emerald-500 ml-auto shrink-0" />
          )}
          {status === "failed" && (
            <X className="h-3 w-3 text-red-500 ml-auto shrink-0" />
          )}
          {status === "running" && (
            <span className="ml-auto text-[10px] text-violet-500 font-medium">Running</span>
          )}
        </div>

        {metric && (
          <p className="text-[12px] text-gray-500 leading-snug">{metric}</p>
        )}

        {task?.errorMessage && (
          <p className="text-[11px] text-red-600 mt-1 leading-snug">{task.errorMessage}</p>
        )}

        {taskLogs.length > 0 && (
          <div className="mt-1.5">
            <button
              onClick={() => setLogsOpen((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-150 ${
                  logsOpen ? "rotate-180" : ""
                }`}
              />
              {taskLogs.length} log entries
            </button>
            {logsOpen && (
              <div className="mt-1.5 rounded-md bg-gray-950 border border-gray-800 p-2.5 max-h-32 overflow-y-auto">
                {taskLogs.map((l) => (
                  <div
                    key={l.id}
                    className="text-[11px] font-mono leading-relaxed flex gap-2"
                  >
                    <span className="text-gray-600 select-none shrink-0">&gt;</span>
                    <span className={l.level === "error" ? "text-red-400" : "text-gray-400"}>
                      {l.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
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

  const senderTask = tasks.find((t) => t.agentName === "sender");
  const sOut = senderTask?.output;
  const delivered = sOut?.delivered as number | undefined;
  const failedSend = sOut?.failed as number | undefined;
  const skippedEmail = sOut?.skippedNoEmail as number | undefined;
  const gmailAccount = sOut?.gmailAccount as string | undefined;
  const showDelivery = delivered != null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 leading-snug mb-2">
              {run.goal}
            </p>
            <StatusTag status={run.status} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Started</span>
            </div>
            <div className="text-[13px] font-semibold text-gray-900 tabular-nums">
              {new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {new Date(run.startedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Duration</span>
            </div>
            <div className="text-[13px] font-semibold text-gray-900 tabular-nums">{totalDur}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Leads</span>
            </div>
            <div className="text-[13px] font-semibold text-gray-900 tabular-nums">{output?.leadCount ?? "-"}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Credits</span>
            </div>
            <div className="text-[13px] font-semibold text-gray-900 tabular-nums">{output?.creditsUsed ?? "-"}</div>
          </div>
        </div>

        {run.errorMessage && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700 flex items-start gap-2">
            <X className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
            <span>{run.errorMessage}</span>
          </div>
        )}
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2 flex items-start gap-2 text-[12px] ${
                w.type === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              {w.type === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : (
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{w.message}</span>
              {w.action && w.link && (
                <a
                  href={w.link}
                  className="shrink-0 text-[11px] font-semibold hover:underline whitespace-nowrap"
                >
                  {w.action}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Agent pipeline (vertical timeline) ── */}
      <div>
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Execution trace
        </h3>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {AGENT_PIPELINE.map((cfg, i) => {
            const task = tasks.find((t) => t.agentName === cfg.key);
            const taskLogs = task ? logs.filter((l) => l.taskId === task.id) : [];
            return (
              <PipelineStep
                key={cfg.key}
                config={cfg}
                task={task}
                taskLogs={taskLogs}
                isLast={i === AGENT_PIPELINE.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* ── Action plan ── */}
      {plan && plan.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Plan
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {plan.map((step, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-[11px] font-semibold text-gray-400 tabular-nums shrink-0 w-4 text-right mt-px">
                  {i + 1}
                </span>
                <span className="text-[12px] text-gray-700 leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Leads ── */}
      {sampleLeads && sampleLeads.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Leads{output?.leadCount != null ? ` (${output.leadCount})` : ""}
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {sampleLeads.map((lead, i) => {
              const initials = lead.name
                ? lead.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : "?";
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500 shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">{lead.name || "Unknown"}</div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {lead.title || "-"}
                      {lead.company && (
                        <span className="text-gray-400"> at {lead.company}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {lead.email ? (
                      <div className="text-[11px] text-gray-700 font-medium truncate max-w-[180px]">{lead.email}</div>
                    ) : (
                      <div className="text-[11px] text-gray-400">No email</div>
                    )}
                    {lead.confidence != null && (
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        <div className="w-12 bg-gray-100 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1 rounded-full"
                            style={{ width: `${Math.min(lead.confidence, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 tabular-nums">{lead.confidence}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {output?.leadCount != null && sampleLeads.length < output.leadCount && (
            <p className="text-[11px] text-gray-400 mt-2 text-center">
              Showing {sampleLeads.length} of {output.leadCount}
            </p>
          )}
        </div>
      )}

      {/* ── Delivery ── */}
      {showDelivery && (
        <div>
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Delivery
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-3 divide-x divide-gray-100 px-4 py-4">
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-600 tabular-nums">{delivered}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide font-medium">Sent</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-500 tabular-nums">{failedSend ?? 0}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide font-medium">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-300 tabular-nums">{skippedEmail ?? 0}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide font-medium">Skipped</div>
              </div>
            </div>
            {gmailAccount && (
              <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-1.5 text-[11px] text-gray-400">
                <Mail className="h-3 w-3" />
                <span>Delivered via {gmailAccount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Credits ── */}
      {output?.creditBreakdown && Object.keys(output.creditBreakdown).length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Credit consumption
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="divide-y divide-gray-100">
              {Object.entries(output.creditBreakdown).map(([agent, credits]) => (
                <div key={agent} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] text-gray-600 capitalize">{agent}</span>
                  <span className="text-[12px] font-semibold text-gray-900 tabular-nums">{credits}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-b-lg">
              <span className="text-[12px] font-semibold text-gray-700">Total</span>
              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{output.creditsUsed ?? 0}</span>
            </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="h-5 w-5 text-gray-700" />
            Agents
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Autonomous multi-agent pipeline
          </p>
        </div>
      </div>

      <AutonomousRunLauncher />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Runs list */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-[12px] font-semibold text-gray-700">Runs</h2>
            <span className="text-[11px] text-gray-400 tabular-nums">{runs.length}</span>
          </div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-10 text-center text-[12px] text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading
              </div>
            ) : runs.length === 0 ? (
              <div className="p-10 text-center text-[12px] text-gray-400">
                <Sparkles className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                No runs yet
              </div>
            ) : (
              runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    selectedRunId === r.id ? "bg-gray-50 border-l-2 border-gray-900" : "border-l-2 border-transparent"
                  }`}
                >
                  <StatusDot status={r.status} size={7} />
                  <div className="flex-1 min-w-0 mt-[-1px]">
                    <p className="text-[12px] text-gray-900 truncate font-medium leading-snug">{r.goal}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                      <span className="tabular-nums">
                        {new Date(r.startedAt).toLocaleDateString([], {
                          month: "short", day: "numeric",
                        })}
                      </span>
                      {r.status === "completed" && r.output?.creditsUsed != null && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="tabular-nums">{r.output.creditsUsed} cr</span>
                        </>
                      )}
                      {r.status === "completed" && r.output?.leadCount != null && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>{r.output.leadCount} leads</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 min-h-[400px]">
          {!selectedRunId ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-[12px]">
              <Bot className="h-8 w-8 text-gray-200 mb-3" />
              Select a run to view details
            </div>
          ) : detailLoading && !detail ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-[12px]">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300 mb-3" />
              Loading
            </div>
          ) : detail ? (
            <RunDetailPanel detail={detail} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-[12px]">
              Run not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
