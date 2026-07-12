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
  ClipboardList,
  Cpu,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
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

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-violet-200 text-violet-800",
  "bg-violet-50 text-violet-600",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-purple-100 text-purple-700",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getLeadName(task: Task) {
  return (
    task.leadFullName ??
    (`${task.leadFirstName ?? ""} ${task.leadLastName ?? ""}`.trim() || "Unknown")
  );
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
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

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<Tab, number>>({
    outbound: 0,
    manual: 0,
    platform: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterLeadName, setFilterLeadName] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  const [appliedCampaign, setAppliedCampaign] = useState("");
  const [appliedCompany, setAppliedCompany] = useState("");
  const [appliedLeadName, setAppliedLeadName] = useState("");
  const [appliedDateStart, setAppliedDateStart] = useState("");
  const [appliedDateEnd, setAppliedDateEnd] = useState("");
  const [appliedFilterCount, setAppliedFilterCount] = useState(0);

  const [approveDropdownOpen, setApproveDropdownOpen] = useState(false);
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
      const res = await fetch(`/api/tasks?${buildParams(true).toString()}`);
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
      const res = await fetch(`/api/tasks?${buildParams(false).toString()}`);
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
      /* non-critical */
    }
  }

  async function loadCampaigns() {
    try {
      const res = await fetch("/api/campaigns?status=all");
      if (!res.ok) return;
      const json = await res.json();
      setCampaigns(json.data ?? []);
    } catch {
      /* non-critical */
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
  /*  Client-side filtering                                            */
  /* ---------------------------------------------------------------- */

  const displayedTasks = tasks.filter((t) => {
    const name = getLeadName(t).toLowerCase();
    const company = (t.leadCompanyName ?? "").toLowerCase();
    const message = (t.message ?? "").toLowerCase();
    const q = search.trim().toLowerCase();
    if (q && !name.includes(q) && !company.includes(q) && !message.includes(q)) return false;
    if (appliedLeadName.trim() && !name.includes(appliedLeadName.trim().toLowerCase())) return false;
    if (appliedDateStart) {
      if (new Date(t.createdAt).getTime() < new Date(appliedDateStart).getTime()) return false;
    }
    if (appliedDateEnd) {
      const end = new Date(appliedDateEnd).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (new Date(t.createdAt).getTime() > end) return false;
    }
    return true;
  });

  const pendingCount = displayedTasks.filter((t) => t.status === "pending").length;

  /* ---------------------------------------------------------------- */
  /*  Filter helpers                                                   */
  /* ---------------------------------------------------------------- */

  function applyFilters() {
    let count = 0;
    if (filterCampaign) count++;
    if (filterCompany.trim()) count++;
    if (filterLeadName.trim()) count++;
    if (filterDateStart || filterDateEnd) count++;
    setAppliedFilterCount(count);
    setAppliedCampaign(filterCampaign);
    setAppliedCompany(filterCompany);
    setAppliedLeadName(filterLeadName);
    setAppliedDateStart(filterDateStart);
    setAppliedDateEnd(filterDateEnd);
    setFiltersOpen(false);
  }

  function clearAllFilters() {
    setFilterCampaign(""); setFilterCompany(""); setFilterLeadName("");
    setFilterDateStart(""); setFilterDateEnd("");
    setAppliedCampaign(""); setAppliedCompany(""); setAppliedLeadName("");
    setAppliedDateStart(""); setAppliedDateEnd("");
    setAppliedFilterCount(0);
  }

  /* ---------------------------------------------------------------- */
  /*  Mutations                                                        */
  /* ---------------------------------------------------------------- */

  async function patchTask(id: string, action: "approve" | "schedule" | "reject", dueDate?: string) {
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
        const ids = displayedTasks.filter((t) => t.status === "pending").map((t) => t.id);
        if (ids.length === 0) return;
        const results = await Promise.all(
          ids.map(async (id) => ({
            id,
            ok: await patchTask(id, pendingOp.op as "approve" | "schedule", confirmDueDate),
          }))
        );
        const okIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
        const failedCount = results.length - okIds.size;
        setTasks((prev) =>
          prev.map((t) =>
            okIds.has(t.id)
              ? { ...t, status: "scheduled", dueDate: confirmDueDate ? new Date(confirmDueDate).toISOString() : t.dueDate }
              : t
          )
        );
        const verb = pendingOp.op === "approve" ? "Approved" : "Scheduled";
        if (okIds.size > 0) toast.success(`${verb} ${okIds.size} task(s)`);
        if (failedCount > 0) toast.error(`Failed to ${pendingOp.op} ${failedCount} task(s)`);
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
          const ok = await patchTask(id, pendingOp.op, pendingOp.op === "schedule" ? confirmDueDate : undefined);
          if (!ok) {
            toast.error(`Failed to ${pendingOp.op} task`);
          } else if (pendingOp.op === "reject") {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            toast.success("Task rejected");
          } else {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === id
                  ? { ...t, status: "scheduled", dueDate: pendingOp.op === "schedule" && confirmDueDate ? new Date(confirmDueDate).toISOString() : t.dueDate }
                  : t
              )
            );
            toast.success(pendingOp.op === "approve" ? "Task approved" : "Task scheduled");
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

  const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType; emptyTitle: string; emptyDesc: string }[] = [
    {
      id: "outbound",
      label: "Outbound to approve",
      icon: Send,
      emptyTitle: "No outbound to approve",
      emptyDesc: "Outbound messages waiting for your approval will appear here.",
    },
    {
      id: "manual",
      label: "Manual tasks",
      icon: ClipboardList,
      emptyTitle: "No manual tasks",
      emptyDesc: "Manual tasks assigned to you will appear here.",
    },
    {
      id: "platform",
      label: "Platform tasks",
      icon: Cpu,
      emptyTitle: "No platform tasks",
      emptyDesc: "Automated platform tasks will appear here.",
    },
  ];

  const modalCopy: Record<TaskOp, { title: string; body: (isBulk: boolean, n: number) => string; cta: string; danger?: boolean }> = {
    approve: {
      title: "Approve task(s)?",
      body: (isBulk, n) => isBulk ? `This will approve ${n} pending task(s) immediately.` : "This will approve this task immediately.",
      cta: "Approve",
    },
    schedule: {
      title: "Schedule task(s)?",
      body: (isBulk, n) => isBulk ? `This will schedule ${n} pending task(s).` : "This will schedule this task.",
      cta: "Schedule",
    },
    reject: {
      title: "Reject this task?",
      body: () => "This permanently removes the task from the queue. This cannot be undone.",
      cta: "Reject",
      danger: true,
    },
    delete: {
      title: "Delete this task?",
      body: () => "This permanently deletes the task. This cannot be undone.",
      cta: "Delete",
      danger: true,
    },
  };

  const currentTabConfig = TAB_CONFIG.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review outbound messages and manage your task queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors capitalize shadow-sm"
            >
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {statusFilter}
              <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", statusDropdownOpen && "rotate-180")} />
            </button>
            {statusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setStatusDropdownOpen(false)} />
                <div className="absolute right-0 top-10 z-30 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                  {(["pending", "scheduled"] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setStatusDropdownOpen(false); }}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors capitalize"
                    >
                      {status}
                      {statusFilter === status && <Check className="h-3.5 w-3.5 text-[#6C47FF]" />}
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
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors shadow-sm",
              appliedFilterCount > 0
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {appliedFilterCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#6C47FF] text-[10px] font-bold text-white">
                {appliedFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                activeTab === id ? "text-[#6C47FF]" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  activeTab === id
                    ? "bg-violet-100 text-[#6C47FF]"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {tabCounts[id]}
              </span>
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6C47FF] rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search + Approve All */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search lead, company, subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
          />
        </div>

        {/* Approve all split button */}
        <div className="flex items-center rounded-lg overflow-hidden border border-[#6C47FF] shadow-sm">
          <button
            disabled={pendingCount === 0}
            onClick={() => { if (pendingCount > 0) openOp("approve", "bulk"); }}
            className={cn(
              "px-4 py-2 text-sm font-semibold text-white bg-[#6C47FF] transition-colors whitespace-nowrap",
              pendingCount === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-[#5a3ad4]"
            )}
          >
            Approve all ({pendingCount})
          </button>
          <div className="relative border-l border-violet-400">
            <button
              disabled={pendingCount === 0}
              onClick={() => setApproveDropdownOpen(!approveDropdownOpen)}
              className={cn(
                "px-2 py-2 text-white bg-[#6C47FF] transition-colors",
                pendingCount === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-[#5a3ad4]"
              )}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", approveDropdownOpen && "rotate-180")} />
            </button>
            {approveDropdownOpen && pendingCount > 0 && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setApproveDropdownOpen(false)} />
                <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                  <button
                    onClick={() => { openOp("approve", "bulk"); setApproveDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#6C47FF]" />
                    Approve all
                  </button>
                  <button
                    onClick={() => { openOp("schedule", "bulk"); setApproveDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CalendarClock className="h-4 w-4 text-gray-500" />
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
        <div className="rounded-2xl border border-gray-200 bg-white flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <currentTabConfig.icon className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{currentTabConfig.emptyTitle}</h3>
          <p className="text-sm text-gray-500 max-w-xs">{currentTabConfig.emptyDesc}</p>
          {appliedFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="mt-4 text-sm text-[#6C47FF] hover:underline font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Lead
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Message
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedTasks.map((task) => {
                const name = getLeadName(task);
                const initials = getInitials(name);
                const colorClass = avatarColor(name);
                return (
                  <tr key={task.id} className="hover:bg-violet-50/30 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", colorClass)}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-snug">{name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{task.leadEmail ?? task.leadCompanyName ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[260px]">
                      {task.message ? (
                        <div className="flex items-start gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-300 mt-0.5 shrink-0" />
                          <p className="text-sm text-gray-600 leading-snug">{truncate(task.message, 80)}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {task.campaignName ? (
                        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                          {task.campaignName}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          task.status === "pending"
                            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        )}
                      >
                        {task.status === "pending" ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {task.status ?? "pending"}
                      </span>
                      {task.dueDate && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                          <CalendarClock className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-gray-400">
                      {formatDate(task.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {task.status === "pending" ? (
                          <>
                            <button
                              onClick={() => openOp("approve", task.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#6C47FF] bg-violet-50 hover:bg-violet-100 transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => openOp("schedule", task.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              Schedule
                            </button>
                            <button
                              onClick={() => openOp("reject", task.id)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openOp("delete", task.id)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== FILTERS PANEL ========== */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setFiltersOpen(false)} />
          <div className="fixed top-0 right-0 z-50 h-full w-[360px] bg-white shadow-2xl border-l border-gray-100 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign</label>
                <select
                  value={filterCampaign}
                  onChange={(e) => setFilterCampaign(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="">All campaigns</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead name</label>
                <input
                  type="text"
                  value={filterLeadName}
                  onChange={(e) => setFilterLeadName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
                <input
                  type="text"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  placeholder="e.g. Acme Inc"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Generated on</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">From</label>
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">To</label>
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

      {/* ========== CONFIRM MODAL ========== */}
      {pendingOp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center",
                modalCopy[pendingOp.op].danger ? "bg-red-100" : "bg-violet-100"
              )}>
                {modalCopy[pendingOp.op].danger
                  ? <Trash2 className="h-4 w-4 text-red-600" />
                  : <CheckCircle2 className="h-4 w-4 text-[#6C47FF]" />
                }
              </div>
              <h3 className="text-base font-bold text-gray-900">{modalCopy[pendingOp.op].title}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4 pl-12">
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={confirmSubmitting}
                onClick={() => { setPendingOp(null); setConfirmDueDate(""); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={confirmSubmitting}
                onClick={confirmPendingOp}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60",
                  modalCopy[pendingOp.op].danger
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
