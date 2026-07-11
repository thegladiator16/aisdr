"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Send,
  ChevronDown,
  SlidersHorizontal,
  X,
  Check,
  Loader2,
  Trash2,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = "outbound" | "manual" | "platform";
type StatusFilter = "pending" | "scheduled";

type Task = {
  id: string;
  leadId: string | null;
  campaignId: string | null;
  taskType: string | null;
  status: string | null;
  message: string | null;
  dueDate: string | null;
  createdAt: string;
  leadFirstName: string | null;
  leadLastName: string | null;
  leadFullName: string | null;
  leadEmail: string | null;
  leadCompanyName: string | null;
  campaignName: string | null;
};

type Campaign = { id: string; name: string };

/* op = the action a confirm-modal invocation will perform.
 * scope = "bulk" (act on every pending task currently in view) or a single
 * task id. Every mutating action funnels through this one modal so the
 * approve-all/schedule-all UX and the per-row actions share one code path. */
type TaskOp = "approve" | "schedule" | "reject" | "delete";

type PendingOp = {
  op: TaskOp;
  scope: "bulk" | string;
} | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TAB_TASK_TYPE: Record<Tab, string> = {
  outbound: "outbound_approval",
  manual: "manual",
  platform: "platform",
};

const TASK_STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  scheduled: "bg-green-50 text-green-700 ring-1 ring-green-200",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getLeadName(task: Task) {
  return (
    task.leadFullName ??
    (`${task.leadFirstName ?? ""} ${task.leadLastName ?? ""}`.trim() ||
      "No lead")
  );
}

function truncate(str: string, max: number) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Tasks Page                                                         */
/* ------------------------------------------------------------------ */

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("outbound");
  const [search, setSearch] = useState("");

  /* data */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<Tab, number>>({
    outbound: 0,
    manual: 0,
    platform: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  /* "Pending" status dropdown */
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  /* Filters slide-in panel — draft (uncommitted) values */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterLeadName, setFilterLeadName] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  /* Filters slide-in panel — applied (committed) values that actually drive
   * the fetch/filter pipeline */
  const [appliedCampaign, setAppliedCampaign] = useState("");
  const [appliedCompany, setAppliedCompany] = useState("");
  const [appliedLeadName, setAppliedLeadName] = useState("");
  const [appliedDateStart, setAppliedDateStart] = useState("");
  const [appliedDateEnd, setAppliedDateEnd] = useState("");
  const [appliedFilterCount, setAppliedFilterCount] = useState(0);

  /* Approve dropdown */
  const [approveDropdownOpen, setApproveDropdownOpen] = useState(false);

  /* Generalized confirm modal (bulk + per-row actions) */
  const [pendingOp, setPendingOp] = useState<PendingOp>(null);
  const [confirmDueDate, setConfirmDueDate] = useState("");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  function buildParams(includeTaskType: boolean) {
    const params = new URLSearchParams();
    if (includeTaskType) params.set("taskType", TAB_TASK_TYPE[activeTab]);
    params.set("status", statusFilter);
    if (appliedCampaign) params.set("campaignId", appliedCampaign);
    if (appliedCompany.trim()) params.set("company", appliedCompany.trim());
    return params;
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const params = buildParams(true);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load tasks");
      const json = await res.json();
      setTasks(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function loadTabCounts() {
    try {
      const params = buildParams(false);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      const counts: Record<Tab, number> = { outbound: 0, manual: 0, platform: 0 };
      for (const t of (json.data ?? []) as Task[]) {
        const tab = (Object.keys(TAB_TASK_TYPE) as Tab[]).find(
          (k) => TAB_TASK_TYPE[k] === t.taskType
        );
        if (tab) counts[tab] += 1;
      }
      setTabCounts(counts);
    } catch {
      // non-critical — tab badge counts just won't refresh
    }
  }

  async function loadCampaigns() {
    try {
      const res = await fetch("/api/campaigns?status=all");
      if (!res.ok) return;
      const json = await res.json();
      setCampaigns(json.data ?? []);
    } catch {
      // non-critical — campaign filter dropdown just stays empty
    }
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, appliedCampaign, appliedCompany]);

  useEffect(() => {
    loadTabCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, appliedCampaign, appliedCompany]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Client-side refinement (search box, lead-name text filter, date  */
  /*  range) layered on top of the server-filtered `tasks` list         */
  /* ---------------------------------------------------------------- */

  const displayedTasks = tasks.filter((t) => {
    const name = getLeadName(t).toLowerCase();
    const company = (t.leadCompanyName ?? "").toLowerCase();
    const message = (t.message ?? "").toLowerCase();

    const q = search.trim().toLowerCase();
    if (q && !name.includes(q) && !company.includes(q) && !message.includes(q))
      return false;

    if (appliedLeadName.trim() && !name.includes(appliedLeadName.trim().toLowerCase()))
      return false;

    if (appliedDateStart) {
      const start = new Date(appliedDateStart).getTime();
      if (new Date(t.createdAt).getTime() < start) return false;
    }
    if (appliedDateEnd) {
      const end = new Date(appliedDateEnd).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (new Date(t.createdAt).getTime() > end) return false;
    }

    return true;
  });

  const pendingCount = displayedTasks.filter((t) => t.status === "pending").length;

  /* ---------------------------------------------------------------- */
  /*  Filter panel helpers                                              */
  /* ---------------------------------------------------------------- */

  function applyFilters() {
    let count = 0;
    if (filterCampaign) count += 1;
    if (filterCompany.trim()) count += 1;
    if (filterLeadName.trim()) count += 1;
    if (filterDateStart || filterDateEnd) count += 1;
    setAppliedFilterCount(count);
    setAppliedCampaign(filterCampaign);
    setAppliedCompany(filterCompany);
    setAppliedLeadName(filterLeadName);
    setAppliedDateStart(filterDateStart);
    setAppliedDateEnd(filterDateEnd);
    setFiltersOpen(false);
  }

  function clearAllFilters() {
    setFilterCampaign("");
    setFilterCompany("");
    setFilterLeadName("");
    setFilterDateStart("");
    setFilterDateEnd("");
    setAppliedCampaign("");
    setAppliedCompany("");
    setAppliedLeadName("");
    setAppliedDateStart("");
    setAppliedDateEnd("");
    setAppliedFilterCount(0);
  }

  /* ---------------------------------------------------------------- */
  /*  Mutations                                                         */
  /* ---------------------------------------------------------------- */

  async function patchTask(
    id: string,
    action: "approve" | "schedule" | "reject",
    dueDate?: string
  ) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, dueDate: dueDate || undefined }),
    });
    return res.ok;
  }

  function openOp(op: TaskOp, scope: "bulk" | string) {
    setPendingOp({ op, scope });
    setConfirmDueDate("");
  }

  async function confirmPendingOp() {
    if (!pendingOp) return;
    setConfirmSubmitting(true);
    try {
      if (pendingOp.scope === "bulk") {
        const ids = displayedTasks
          .filter((t) => t.status === "pending")
          .map((t) => t.id);

        if (ids.length === 0) return;

        const results = await Promise.all(
          ids.map(async (id) => ({
            id,
            ok: await patchTask(
              id,
              pendingOp.op as "approve" | "schedule",
              confirmDueDate
            ),
          }))
        );
        const okIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
        const failedCount = results.length - okIds.size;

        setTasks((prev) =>
          prev.map((t) =>
            okIds.has(t.id)
              ? {
                  ...t,
                  status: "scheduled",
                  dueDate: confirmDueDate
                    ? new Date(confirmDueDate).toISOString()
                    : t.dueDate,
                }
              : t
          )
        );

        const verb = pendingOp.op === "approve" ? "Approved" : "Scheduled";
        if (okIds.size > 0) toast.success(`${verb} ${okIds.size} task(s)`);
        if (failedCount > 0)
          toast.error(`Failed to ${pendingOp.op} ${failedCount} task(s)`);
      } else {
        const id = pendingOp.scope;

        if (pendingOp.op === "delete") {
          const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
          if (res.ok) {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            toast.success("Task deleted");
          } else {
            toast.error("Failed to delete task");
          }
        } else {
          const ok = await patchTask(
            id,
            pendingOp.op,
            pendingOp.op === "schedule" ? confirmDueDate : undefined
          );
          if (!ok) {
            toast.error(`Failed to ${pendingOp.op} task`);
          } else if (pendingOp.op === "reject") {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            toast.success("Task rejected");
          } else {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      status: "scheduled",
                      dueDate:
                        pendingOp.op === "schedule" && confirmDueDate
                          ? new Date(confirmDueDate).toISOString()
                          : t.dueDate,
                    }
                  : t
              )
            );
            toast.success(
              pendingOp.op === "approve" ? "Task approved" : "Task scheduled"
            );
          }
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setConfirmSubmitting(false);
      setPendingOp(null);
      setConfirmDueDate("");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "outbound", label: "Outbound to approve" },
    { id: "manual", label: "Manual tasks" },
    { id: "platform", label: "Platform tasks" },
  ];

  const modalCopy: Record<
    TaskOp,
    { title: string; body: (isBulk: boolean, n: number) => string; cta: string }
  > = {
    approve: {
      title: "Approve task(s)?",
      body: (isBulk, n) =>
        isBulk
          ? `This will approve ${n} pending task(s) immediately.`
          : "This will approve this task immediately.",
      cta: "Approve",
    },
    schedule: {
      title: "Schedule task(s)?",
      body: (isBulk, n) =>
        isBulk
          ? `This will schedule ${n} pending task(s).`
          : "This will schedule this task.",
      cta: "Schedule",
    },
    reject: {
      title: "Reject this task?",
      body: () => "This permanently removes the task from the queue. This cannot be undone.",
      cta: "Reject",
    },
    delete: {
      title: "Delete this task?",
      body: () => "This permanently deletes the task. This cannot be undone.",
      cta: "Delete",
    },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tasks</h1>

      {/* Tabs + Controls Row */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        {/* Tabs */}
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}{" "}
              <span
                className={`ml-1 ${
                  activeTab === tab.id ? "text-violet-500" : "text-gray-400"
                }`}
              >
                [{tabCounts[tab.id]}]
              </span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 pb-3">
          {/* Pending/Scheduled dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors capitalize"
            >
              {statusFilter}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {statusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setStatusDropdownOpen(false)}
                />
                <div className="absolute left-0 top-10 z-30 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {(["pending", "scheduled"] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setStatusDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors capitalize"
                    >
                      {status}
                      {statusFilter === status && (
                        <Check className="h-3.5 w-3.5 text-[#6C47FF]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Filters button */}
          <button
            onClick={() => setFiltersOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              appliedFilterCount > 0
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {appliedFilterCount > 0 && (
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                {appliedFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search + Approve All */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search lead, company, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
          />
        </div>

        {/* Approve all button + dropdown */}
        <div className="flex items-center">
          <button
            disabled={pendingCount === 0}
            onClick={() => {
              if (pendingCount > 0) openOp("approve", "bulk");
            }}
            className={`rounded-l-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap ${
              pendingCount === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#5a3ad4]"
            }`}
          >
            Approve all ({pendingCount})
          </button>

          {/* Dropdown arrow */}
          <div className="relative">
            <button
              onClick={() => setApproveDropdownOpen(!approveDropdownOpen)}
              className={`rounded-r-lg border-l border-violet-400 bg-[#6C47FF] px-2 py-2 text-white transition-colors ${
                pendingCount === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#5a3ad4]"
              }`}
              disabled={pendingCount === 0}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${approveDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {approveDropdownOpen && pendingCount > 0 && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setApproveDropdownOpen(false)}
                />
                <div className="absolute right-0 top-10 z-30 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      openOp("approve", "bulk");
                      setApproveDropdownOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Approve all
                  </button>
                  <button
                    onClick={() => {
                      openOp("schedule", "bulk");
                      setApproveDropdownOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Schedule all
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : displayedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Send className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {activeTab === "outbound"
              ? "No outbound to approve"
              : activeTab === "manual"
                ? "No manual tasks"
                : "No platform tasks"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === "outbound"
              ? "Outbound messages waiting for approval will appear here."
              : activeTab === "manual"
                ? "Manual tasks assigned to you will appear here."
                : "Platform tasks will appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Lead
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Message
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-violet-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{getLeadName(task)}</p>
                    <p className="text-xs text-gray-400">
                      {task.leadCompanyName ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[280px]">
                    {truncate(task.message ?? "", 90)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                    {task.campaignName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        TASK_STATUS_STYLE[task.status ?? "pending"] ??
                          "text-gray-500 bg-gray-100"
                      )}
                    >
                      {task.status ?? "pending"}
                    </span>
                    {task.dueDate && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                        <CalendarClock className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {formatDate(task.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {task.status === "pending" ? (
                        <>
                          <button
                            onClick={() => openOp("approve", task.id)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openOp("schedule", task.id)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Schedule
                          </button>
                          <button
                            onClick={() => openOp("reject", task.id)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openOp("delete", task.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== FILTERS SLIDE-IN PANEL ========== */}
      {filtersOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setFiltersOpen(false)}
          />

          {/* panel */}
          <div className="fixed top-0 right-0 z-50 h-full w-[360px] bg-white shadow-2xl border-l border-gray-200 flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Campaign */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Campaign
                </label>
                <select
                  value={filterCampaign}
                  onChange={(e) => setFilterCampaign(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="">All campaigns</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lead name contains
                </label>
                <input
                  type="text"
                  value={filterLeadName}
                  onChange={(e) => setFilterLeadName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company contains
                </label>
                <input
                  type="text"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  placeholder="e.g. Acme Inc"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
              </div>

              {/* Generated on: date range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Generated on
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">
                      End date
                    </label>
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={applyFilters}
                className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== CONFIRM MODAL (bulk + per-row actions) ========== */}
      {pendingOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {modalCopy[pendingOp.op].title}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {modalCopy[pendingOp.op].body(pendingOp.scope === "bulk", pendingCount)}
            </p>

            {pendingOp.op === "schedule" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Send date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={confirmDueDate}
                  onChange={(e) => setConfirmDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                disabled={confirmSubmitting}
                onClick={() => {
                  setPendingOp(null);
                  setConfirmDueDate("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={confirmSubmitting}
                onClick={confirmPendingOp}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60",
                  pendingOp.op === "reject" || pendingOp.op === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#6C47FF] hover:bg-[#5a39dd]"
                )}
              >
                {confirmSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {modalCopy[pendingOp.op].cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
