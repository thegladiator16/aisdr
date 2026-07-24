"use client";

import { useState, useRef } from "react";
import { Bot, Loader2, Play, Sparkles, Search, BarChart3, PenLine, Send, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AgentEvent {
  kind: string;
  runId: string;
  taskId?: string;
  agent?: string;
  message?: string;
  data?: unknown;
}

/**
 * "Autonomous Mode" launcher — form + live event feed. POSTs to
 * /api/agents/run-campaign, reads the SSE stream, appends events to a
 * scrolling activity log. When the run completes, redirects to the
 * detail page under /dashboard/agents.
 */
export function AutonomousRunLauncher({ campaignId }: { campaignId?: string }) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [industry, setIndustry] = useState("");
  const [titles, setTitles] = useState("");
  const [location, setLocation] = useState("");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  function push(e: AgentEvent) {
    setEvents((prev) => [...prev, e]);
    // Scroll the feed to bottom on next tick.
    setTimeout(() => {
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
    }, 0);
  }

  async function start() {
    if (!goal.trim()) {
      toast.error("Give Arya a goal first, e.g. 'Book 5 demos with FinTech CFOs'.");
      return;
    }
    setRunning(true);
    setEvents([]);
    try {
      const res = await fetch("/api/agents/run-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          campaignId,
          icp: {
            industry: industry ? industry.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
            jobTitles: titles ? titles.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
            location: location ? location.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          },
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || `Run failed to start (${res.status})`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastRunId: string | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by blank lines.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const e = JSON.parse(line.slice(6)) as AgentEvent;
            push(e);
            if (e.runId && e.runId !== "unknown") lastRunId = e.runId;
            if (e.kind === "run_completed") {
              toast.success("Autonomous run complete");
              window.dispatchEvent(new Event("aryasdr:credits-updated"));
            } else if (e.kind === "run_failed") {
              toast.error(e.message || "Autonomous run failed");
            }
          } catch {
            /* skip malformed frame */
          }
        }
      }
      if (lastRunId) {
        // Give the toast a beat, then route to the detail page.
        setTimeout(() => router.push(`/dashboard/agents?run=${lastRunId}`), 800);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  const pipelineIcons = [
    { icon: Bot, label: "Orchestrator" },
    { icon: Search, label: "Research" },
    { icon: BarChart3, label: "Analysis" },
    { icon: PenLine, label: "Copywriter" },
    { icon: Send, label: "Sender" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            Autonomous Mode
          </h3>
          <p className="text-xs text-gray-500">
            Hand Arya the goal: orchestrator, prospecting, research, copywriter, and sender agents run end-to-end.
          </p>
        </div>
      </div>

      {/* Agent pipeline visualization */}
      <div className="flex items-center justify-center gap-2 py-2">
        {pipelineIcons.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className="h-10 w-10 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-center"
                title={step.label}
                aria-label={step.label}
              >
                <Icon className="h-4 w-4 text-violet-600" />
              </div>
              {i < pipelineIcons.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={running}
          placeholder="Book 5 demos with B2B SaaS founders in India"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={running}
            placeholder="Industry (comma-sep)"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
          />
          <input
            value={titles}
            onChange={(e) => setTitles(e.target.value)}
            disabled={running}
            placeholder="Job titles"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={running}
            placeholder="Location"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
          />
        </div>
      </div>

      <button
        onClick={start}
        disabled={running}
        className="w-full rounded-full bg-[#6C47FF] text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5835E8] active:scale-[0.98] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Agents working…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Launch Arya
          </>
        )}
      </button>

      {events.length > 0 && (
        <div
          ref={feedRef}
          className="max-h-64 overflow-y-auto rounded-lg border border-gray-100 bg-white p-3 space-y-1.5 text-xs font-mono"
        >
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-2">
              <Sparkles
                className={`h-3 w-3 mt-0.5 shrink-0 ${
                  e.kind === "task_failed" || e.kind === "run_failed"
                    ? "text-red-500"
                    : e.kind === "task_completed" || e.kind === "run_completed"
                    ? "text-emerald-500"
                    : "text-violet-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <span className="text-gray-500">
                  [{e.agent ?? e.kind.split("_")[0]}]
                </span>{" "}
                <span className="text-gray-800">
                  {e.message ?? `${e.kind}${e.agent ? ` (${e.agent})` : ""}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
