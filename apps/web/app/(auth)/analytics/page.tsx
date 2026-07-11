"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Send,
  MessageCircle,
  Calendar,
  BarChart2,
  Mail,
  Inbox,
  Star,
  AlertTriangle,
  Phone,
  Clock,
  DollarSign,
  ChevronDown,
  Check,
  X,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChangePlanModal } from "@/components/billing/ChangePlanModal";
import { useSubscription } from "@/lib/hooks/useSubscription";

type Tab = "overview" | "messaging" | "deliverability" | "dialer" | "credits";

/* ------------------------------------------------------------------ */
/*  Shared analytics data                                              */
/* ------------------------------------------------------------------ */
type AnalyticsOverview = {
  totalCampaigns: number;
  totalLeads: number;
  emailsSent: number;
  avgOpenRate: number;
  avgReplyRate: number;
  meetingsBooked: number;
  totalReplies: number;
  positiveReplies: number;
  bounces: number;
  bounceRate: number;
};

type ActivityPoint = {
  date: string;
  sent: number;
  opened: number;
  replied: number;
};

type FunnelRow = { status: string; count: number };

type Transaction = {
  id: string;
  amount: number;
  currency: string | null;
  status: string;
  description: string | null;
  providerPaymentId: string | null;
  createdAt: string;
};

function useAnalyticsData() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [activityTimeline, setActivityTimeline] = useState<ActivityPoint[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [analyticsRes, v1Res, txRes] = await Promise.all([
          fetch("/api/analytics", { cache: "no-store" }),
          fetch("/api/v1/analytics", { cache: "no-store" }),
          fetch("/api/billing/transactions", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        if (analyticsRes.ok) {
          const json = await analyticsRes.json();
          setOverview(json.data ?? null);
        }
        if (v1Res.ok) {
          const json = await v1Res.json();
          setActivityTimeline(
            (json.activityTimeline ?? []).map((row: any) => ({
              date: row.date,
              sent: Number(row.sent) || 0,
              opened: Number(row.opened) || 0,
              replied: Number(row.replied) || 0,
            }))
          );
          setFunnelData(
            (json.funnelData ?? []).map((row: any) => ({
              status: row.status ?? "unknown",
              count: Number(row.count) || 0,
            }))
          );
        }
        if (txRes.ok) {
          const json = await txRes.json();
          setTransactions(Array.isArray(json.transactions) ? json.transactions : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { overview, activityTimeline, funnelData, transactions, loading };
}

function formatChartDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Timeline chart (recharts)                                          */
/* ------------------------------------------------------------------ */
function TimelineChart({
  data,
  lines,
}: {
  data: ActivityPoint[];
  lines: { key: "sent" | "opened" | "replied"; label: string; color: string }[];
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 12, fill: "#9CA3AF" }}
            axisLine={{ stroke: "#E5E7EB" }}
          />
          <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={{ stroke: "#E5E7EB" }} allowDecimals={false} />
          <Tooltip labelFormatter={formatChartDate} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-up">
      <Download className="h-4 w-4" />
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Dropdown                                                    */
/* ------------------------------------------------------------------ */
function Dropdown({
  value,
  options,
  onChange,
  width = "w-48",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors min-w-[120px]"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute right-0 mt-1 ${width} bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 max-h-72 overflow-y-auto`}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 transition-colors"
            >
              <span>{opt}</span>
              {value === opt && <Check className="h-4 w-4 text-violet-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  extra,
  headerRight,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle?: string;
  extra?: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="bg-gray-100 rounded-lg p-2 inline-flex">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        {headerRight}
      </div>
      <p className="text-sm text-gray-500 mt-3">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {extra}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty Chart                                                        */
/* ------------------------------------------------------------------ */
function EmptyChart({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <BarChart2 className="h-16 w-16 text-gray-200 mb-4" />
      <p className="text-sm font-medium text-gray-500">{title || "No chart data"}</p>
      <p className="text-xs text-gray-400 mt-1">
        {description || "Data will appear here once you start your campaigns."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pill Toggle                                                        */
/* ------------------------------------------------------------------ */
function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            value === opt.key
              ? "bg-violet-100 text-violet-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Multi-select Checkbox Group                                        */
/* ------------------------------------------------------------------ */
function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer group">
            <div
              className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                selected.has(opt) ? "bg-violet-600 border-violet-600" : "border-gray-300 group-hover:border-gray-400"
              }`}
            >
              {selected.has(opt) && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="text-sm text-gray-600">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter Select Dropdown (inside panel)                              */
/* ------------------------------------------------------------------ */
function FilterSelect({
  label,
  placeholder,
  options,
  selected,
  onToggle,
}: {
  label: string;
  placeholder: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const selectedArr = Array.from(selected);

  return (
    <div ref={ref} className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={selectedArr.length > 0 ? "text-gray-900" : "text-gray-400"}>
          {selectedArr.length > 0 ? `${selectedArr.length} selected` : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border border-gray-200 rounded-xl shadow-lg bg-white py-1 max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                    selected.has(opt) ? "bg-violet-600 border-violet-600" : "border-gray-300"
                  }`}
                >
                  {selected.has(opt) && <Check className="h-3 w-3 text-white" />}
                </div>
                {opt}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filters Panel                                                      */
/* ------------------------------------------------------------------ */
function FiltersPanel({
  open,
  onClose,
  personalizationTypes,
  setPersonalizationTypes,
  seniorities,
  setSeniorities,
  industries,
  setIndustries,
}: {
  open: boolean;
  onClose: () => void;
  personalizationTypes: Set<string>;
  setPersonalizationTypes: React.Dispatch<React.SetStateAction<Set<string>>>;
  seniorities: Set<string>;
  setSeniorities: React.Dispatch<React.SetStateAction<Set<string>>>;
  industries: Set<string>;
  setIndustries: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function clearAll() {
    setPersonalizationTypes(new Set());
    setSeniorities(new Set());
    setIndustries(new Set());
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-30 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 w-[400px] h-full bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <p className="text-sm text-gray-500 mt-0.5">Refine your campaign analytics data</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* CAMPAIGNS section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Campaigns</p>
            <div className="space-y-6">
              <CheckboxGroup
                label="Personalization types"
                options={[
                  "Web scrape",
                  "AI research",
                  "Recipient profile",
                  "Funding announcement",
                  "Company news",
                  "Acquisition",
                  "Hiring signal",
                ]}
                selected={personalizationTypes}
                onToggle={(v) => toggleInSet(setPersonalizationTypes, v)}
              />
              <FilterSelect
                label="Contact/job title"
                placeholder="Select seniorities"
                options={["C-suite", "VP", "Director", "Manager", "Individual contributor"]}
                selected={seniorities}
                onToggle={(v) => toggleInSet(setSeniorities, v)}
              />
            </div>
          </div>

          {/* LEAD COMPANIES section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Lead Companies</p>
            <FilterSelect
              label="Industries"
              placeholder="Select industries"
              options={["SaaS", "Fintech", "Healthcare", "EdTech", "E-commerce", "HR Tech", "Other"]}
              selected={industries}
              onToggle={(v) => toggleInSet(setIndustries, v)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-6 space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            Apply filters
          </button>
          <button
            onClick={clearAll}
            className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Clear all filters
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Date Range Dropdown (with Custom option)                           */
/* ------------------------------------------------------------------ */
function DateRangeDropdown({
  value,
  onChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: {
  value: string;
  onChange: (v: string) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options = [
    "7 days",
    "14 days",
    "30 days",
    "60 days",
    "90 days",
    "This month",
    "Last month",
    "This quarter",
    "Last quarter",
    "Last 12 months",
    "This year",
    "Last year",
    "All time",
    "Custom",
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span>{value}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 max-h-[420px] overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                if (opt !== "Custom") setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 transition-colors"
            >
              <span>{opt}</span>
              {value === opt && <Check className="h-4 w-4 text-violet-600" />}
            </button>
          ))}
          {value === "Custom" && (
            <div className="px-3 py-3 border-t border-gray-100 space-y-2">
              <div>
                <label className="text-xs text-gray-500">Start date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => onCustomStartChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">End date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => onCustomEndChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 mt-0.5"
                />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-full bg-violet-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-violet-700 transition-colors mt-1"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Tab                                                       */
/* ------------------------------------------------------------------ */
function OverviewTab({
  onToast,
  overview,
  activityTimeline,
  funnelData,
}: {
  onToast: (msg: string) => void;
  overview: AnalyticsOverview | null;
  activityTimeline: ActivityPoint[];
  funnelData: FunnelRow[];
}) {
  const [leadsToggle, setLeadsToggle] = useState<"new" | "all">("new");
  const [responsesToggle, setResponsesToggle] = useState<"all" | "positive">("all");

  const newLeadsCount = funnelData.find((f) => f.status === "new")?.count ?? 0;
  const leadsValue = leadsToggle === "new" ? newLeadsCount : overview?.totalLeads ?? 0;
  const responsesValue =
    responsesToggle === "all" ? overview?.totalReplies ?? 0 : overview?.positiveReplies ?? 0;

  const hasChartData = activityTimeline.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={UserPlus}
          title="Leads contacted"
          value={leadsValue.toLocaleString()}
          subtitle={leadsToggle === "new" ? "New leads" : "All leads"}
          headerRight={
            <PillToggle
              options={[
                { key: "new" as const, label: "New" },
                { key: "all" as const, label: "All" },
              ]}
              value={leadsToggle}
              onChange={setLeadsToggle}
            />
          }
        />
        <StatCard
          icon={Send}
          title="Messages sent"
          value={(overview?.emailsSent ?? 0).toLocaleString()}
          subtitle={`${overview?.avgOpenRate ?? 0}% avg. open rate`}
        />
        <StatCard
          icon={MessageCircle}
          title="Responses"
          value={responsesValue.toLocaleString()}
          subtitle={responsesToggle === "all" ? "All responses" : "Positive sentiment"}
          headerRight={
            <PillToggle
              options={[
                { key: "all" as const, label: "All" },
                { key: "positive" as const, label: "Positive" },
              ]}
              value={responsesToggle}
              onChange={setResponsesToggle}
            />
          }
        />
        <StatCard
          icon={Calendar}
          title="Meetings booked"
          value={(overview?.meetingsBooked ?? 0).toLocaleString()}
          subtitle="All time"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Activity over the last 14 days</h3>
          <button
            onClick={() => {
              downloadCsv(
                "analytics-activity.csv",
                ["Date", "Sent", "Opened", "Replied"],
                activityTimeline.map((r) => [r.date, r.sent, r.opened, r.replied])
              );
              onToast("Exported activity.csv");
            }}
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
        {hasChartData ? (
          <TimelineChart
            data={activityTimeline}
            lines={[
              { key: "sent", label: "Sent", color: "#6C47FF" },
              { key: "opened", label: "Opened", color: "#10B981" },
              { key: "replied", label: "Replied", color: "#F59E0B" },
            ]}
          />
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Messaging Tab                                                      */
/* ------------------------------------------------------------------ */
function MessagingTab({
  overview,
  activityTimeline,
}: {
  overview: AnalyticsOverview | null;
  activityTimeline: ActivityPoint[];
}) {
  const hasChartData = activityTimeline.length > 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Mail}
          title="Emails sent"
          value={(overview?.emailsSent ?? 0).toLocaleString()}
          subtitle="All time"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Emails sent over time</h3>
        {hasChartData ? (
          <TimelineChart
            data={activityTimeline}
            lines={[{ key: "sent", label: "Sent", color: "#6C47FF" }]}
          />
        ) : (
          <EmptyChart />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Top conversation drivers</h3>
          <Dropdown
            value="Reply rate"
            options={["Reply rate", "Open rate", "Click rate"]}
            onChange={() => {}}
            width="w-40"
          />
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No conversation drivers yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Per-lead driver ranking isn&apos;t tracked yet — this will populate once that
            breakdown is built.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deliverability Tab                                                 */
/* ------------------------------------------------------------------ */
function DeliverabilityTab({
  overview,
  activityTimeline,
}: {
  overview: AnalyticsOverview | null;
  activityTimeline: ActivityPoint[];
}) {
  const hasChartData = activityTimeline.length > 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Send}
          title="Emails sent"
          value={(overview?.emailsSent ?? 0).toLocaleString()}
          subtitle="All time"
        />
        <StatCard
          icon={Inbox}
          title="Inbox placement rate"
          value="N/A"
          subtitle="Needs ESP feedback-loop tracking (not integrated)"
        />
        <StatCard
          icon={Star}
          title="Reply rate"
          value={`${overview?.avgReplyRate ?? 0}%`}
          subtitle="All time"
        />
        <StatCard
          icon={AlertTriangle}
          title="Bounce rate"
          value={`${overview?.bounceRate ?? 0}%`}
          subtitle={`${overview?.bounces ?? 0} bounces`}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery status over time</h3>
        {hasChartData ? (
          <TimelineChart
            data={activityTimeline}
            lines={[
              { key: "sent", label: "Sent", color: "#6C47FF" },
              { key: "opened", label: "Opened", color: "#10B981" },
            ]}
          />
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dialer Tab                                                         */
/* ------------------------------------------------------------------ */
function DialerTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Phone} title="Calls made" value="0" subtitle="No change" />
        <StatCard icon={Phone} title="Calls connected" value="0" subtitle="0 (0% connection rate)" />
        <StatCard
          icon={Phone}
          title="Avg. call duration"
          value="0m 0s"
          extra={<p className="text-xs text-green-600">+0.0% vs. previous</p>}
        />
        <StatCard
          icon={BarChart2}
          title="Connected outcome distribution"
          value="0% positive response rate"
          extra={
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                <span className="text-green-600">0 positive</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />
                <span className="text-yellow-600">0 neutral</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                <span className="text-red-600">0 negative</span>
              </span>
            </div>
          }
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Call trends</h3>
        <EmptyChart />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Credits Tab                                                        */
/* ------------------------------------------------------------------ */
function CreditsTab({
  onToast,
  transactions,
}: {
  onToast: (msg: string) => void;
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [breakdownView, setBreakdownView] = useState<"campaign" | "action">("campaign");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const { data: subscription } = useSubscription();

  const creditsRemaining = subscription
    ? Math.max(0, subscription.credits - subscription.creditsUsed)
    : 0;

  const formatINR = (amountPaise: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amountPaise / 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Credits</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/settings/billing")}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Buy extra credits
          </button>
          <button
            onClick={() => setShowPlanModal(true)}
            className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
          >
            Upgrade plan
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={BarChart2}
          title="Credits used"
          value={(subscription?.creditsUsed ?? 0).toLocaleString()}
          subtitle={`of ${(subscription?.credits ?? 0).toLocaleString()} on the ${subscription?.tier ?? "trial"} plan`}
        />
        <StatCard
          icon={DollarSign}
          title="Current balance"
          value={creditsRemaining.toLocaleString()}
          subtitle="Available credits"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Credits used over time</h3>
        <EmptyChart
          title="No per-day usage log yet"
          description="Credit consumption isn't logged per-event yet, so a daily trend isn't available."
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Usage breakdown</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setBreakdownView("campaign")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  breakdownView === "campaign"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                By campaign
              </button>
              <button
                onClick={() => setBreakdownView("action")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  breakdownView === "action"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                By action type
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No usage breakdown yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Per-{breakdownView} credit attribution isn&apos;t tracked yet — this needs
            per-action metering to be wired into each credit-consuming feature.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Transaction history</h3>
          <button
            onClick={() => {
              if (transactions.length === 0) {
                onToast("No transactions to export yet");
                return;
              }
              downloadCsv(
                "aryasdr-transactions.csv",
                ["Invoice", "Status", "Amount", "Created"],
                transactions.map((t) => [
                  t.providerPaymentId ?? t.id,
                  t.status,
                  ((t.amount ?? 0) / 100).toFixed(2),
                  new Date(t.createdAt).toISOString(),
                ])
              );
              onToast("Exported transactions.csv");
            }}
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2 pr-4">Invoice</th>
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2 pr-4">Status</th>
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2 pr-4">Amount</th>
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4 text-sm text-gray-700 font-mono text-xs">
                  {t.providerPaymentId ?? t.id.slice(0, 12)}
                </td>
                <td className="py-2 pr-4 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.status === "succeeded"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-sm text-gray-700">{formatINR(t.amount ?? 0)}</td>
                <td className="py-2 text-sm text-gray-700">
                  {new Date(t.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">No transactions yet</p>
          </div>
        )}
      </div>
      {showPlanModal && <ChangePlanModal onClose={() => setShowPlanModal(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs config                                                        */
/* ------------------------------------------------------------------ */
const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "messaging", label: "Messaging" },
  { key: "deliverability", label: "Deliverability" },
  { key: "dialer", label: "Dialer" },
  { key: "credits", label: "Credits" },
];

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Date range dropdown
  const [dateRange, setDateRange] = useState("30 days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // View by dropdown
  const [viewBy, setViewBy] = useState("Daily");

  // Filters panel
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [personalizationTypes, setPersonalizationTypes] = useState<Set<string>>(new Set());
  const [seniorities, setSeniorities] = useState<Set<string>>(new Set());
  const [industries, setIndustries] = useState<Set<string>>(new Set());

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const activeFilterCount =
    personalizationTypes.size + seniorities.size + industries.size;

  const { overview, activityTimeline, funnelData, transactions } = useAnalyticsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-3">
          <DateRangeDropdown
            value={dateRange}
            onChange={setDateRange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <Dropdown
            value={viewBy}
            onChange={setViewBy}
            options={["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]}
            width="w-40"
          />
          <button
            onClick={() => setFiltersOpen(true)}
            className="relative flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          onToast={showToast}
          overview={overview}
          activityTimeline={activityTimeline}
          funnelData={funnelData}
        />
      )}
      {activeTab === "messaging" && (
        <MessagingTab overview={overview} activityTimeline={activityTimeline} />
      )}
      {activeTab === "deliverability" && (
        <DeliverabilityTab overview={overview} activityTimeline={activityTimeline} />
      )}
      {activeTab === "dialer" && <DialerTab />}
      {activeTab === "credits" && (
        <CreditsTab onToast={showToast} transactions={transactions} />
      )}

      {/* Filters Panel */}
      <FiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        personalizationTypes={personalizationTypes}
        setPersonalizationTypes={setPersonalizationTypes}
        seniorities={seniorities}
        setSeniorities={setSeniorities}
        industries={industries}
        setIndustries={setIndustries}
      />

      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {/* Slide-up animation for toast */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}} />
    </div>
  );
}
