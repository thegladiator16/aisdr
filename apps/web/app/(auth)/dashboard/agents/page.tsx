"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, ChevronRight, CircleCheck, CircleX, Loader2, Sparkles } from "lucide-react";
import { AutonomousRunLauncher } from "@/components/agents/AutonomousRunLauncher";

interface Run {
  id: string;
  status: string;
  goal: string;
  campaignId: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  output: {
    creditsUsed?: number;
    creditBreakdown?: Record<string, number>;
    leadCount?: number;
    emailCount?: number;
    [key: string]: unknown;
  } | null;
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

const AGENT_LABELS: Record<string, string> = {
  orchestrator: "Orchestrator",
  prospecting: "Prospecting",
  research: "Research",
  copywriter: "Copywriter",
  sender: "Sender",
  reply_handler: "Reply Handler",
  meeting_booker: "Meeting Booker",
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    running: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    failed: "bg-red-50 text-red-700 ring-1 ring-red-200",
    pending: "bg-gray-50 text-gray-600 ring-1 ring-gray-200",
    paused: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        map[status] ?? map.pending
      }`}
    >
      {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "completed" && <CircleCheck className="h-3 w-3" />}
      {status === "failed" && <CircleX className="h-3 w-3" />}
      {status}
    </span>
  );
}

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

  // Refs so the polling interval always reads the latest values without
  // being recreated on every render (avoids stale-closure bugs).
  const selectedRunIdRef = useRef(selectedRunId);
  const runsRef = useRef(runs);
  useEffect(() => { selectedRunIdRef.current = selectedRunId; }, [selectedRunId]);
  useEffect(() => { runsRef.current = runs; }, [runs]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/agents/runs/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setDetail(null);
        return;
      }
      const json = await res.json();
      setDetail(json.data as RunDetail);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Initial load + polling. Uses refs so the interval never has a stale
  // closure on `runs` or `selectedRunId`.
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

  // Fetch detail whenever the selected run changes; clear stale panel first.
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_2fr] gap-4">
        {/* Runs list */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent runs</h2>
            <span className="text-xs text-gray-400">{runs.length}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
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
                    selectedRunId === r.id ? "bg-violet-50/60" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusPill status={r.status} />
                      <span className="text-[11px] text-gray-400">
                        {new Date(r.startedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 truncate">{r.goal}</p>
                    {r.status === "completed" && r.output?.creditsUsed != null && (
                      <p className="text-[10px] text-violet-600 font-medium mt-0.5">
                        Credits used: {r.output.creditsUsed}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Run detail */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          {!selectedRunId ? (
            <div className="text-center py-16 text-sm text-gray-500">
              Pick a run on the left to see its agent trace.
            </div>
          ) : detailLoading && !detail ? (
            <div className="text-center py-16 text-sm text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading trace…
            </div>
          ) : detail ? (
            <>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={detail.run.status} />
                  <span className="text-xs text-gray-400">
                    Started {new Date(detail.run.startedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{detail.run.goal}</p>
                {detail.run.errorMessage && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                    {detail.run.errorMessage}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Agent trace
                </h3>
                {detail.tasks.map((t) => {
                  const taskLogs = detail.logs.filter((l) => l.taskId === t.id);
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <StatusPill status={t.status} />
                        <span className="text-sm font-medium text-gray-900">
                          {AGENT_LABELS[t.agentName] ?? t.agentName}
                        </span>
                        {t.completedAt && t.startedAt && (
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {Math.max(
                              0,
                              Math.round(
                                (new Date(t.completedAt).getTime() -
                                  new Date(t.startedAt).getTime()) /
                                  100
                              ) / 10
                            )}
                            s
                          </span>
                        )}
                      </div>
                      {taskLogs.length > 0 && (
                        <ul className="text-xs text-gray-600 space-y-0.5 pl-6">
                          {taskLogs.map((l) => (
                            <li key={l.id} className="flex gap-2">
                              <span className="text-gray-300">›</span>
                              <span className="flex-1">{l.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {t.errorMessage && (
                        <p className="text-[11px] text-red-600 pl-6">
                          {t.errorMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {detail.run.output?.creditsUsed != null && (
                <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
                      Credits used
                    </h3>
                    <span className="text-sm font-bold text-violet-800">
                      {detail.run.output.creditsUsed}
                    </span>
                  </div>
                  {detail.run.output.creditBreakdown &&
                    Object.keys(detail.run.output.creditBreakdown).length > 0 && (
                      <div className="space-y-1">
                        {Object.entries(detail.run.output.creditBreakdown).map(
                          ([agent, credits]) => (
                            <div key={agent} className="flex justify-between text-xs text-violet-700">
                              <span className="capitalize">{agent}</span>
                              <span className="font-medium">{credits}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>
              )}

              {detail.run.output && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Result
                  </h3>
                  <pre className="text-[11px] bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto">
                    {JSON.stringify(detail.run.output, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-sm text-gray-500">
              Run not found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
