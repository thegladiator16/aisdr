"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  X,
  ChevronRight,
  Users,
  Send,
  MessageSquare,
  Target,
  Box,
  Flame,
  TrendingUp,
  Globe,
  MoreHorizontal,
  Copy,
  Archive,
  AlertTriangle,
  Loader2,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Zap,
  ChevronDown,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/* ---------- types ---------- */

type Campaign = {
  id: string;
  name: string;
  type?: string | null;
  status: string | null;
  totalLeads: number | null;
  emailsSent: number | null;
  totalReplies: number | null;
  meetingsBooked: number | null;
  requireApproval?: boolean | null;
  createdAt?: string | null;
};

type ModalState = "closed" | "step1" | "step2";

type CampaignOption = {
  id: string;
  icon: typeof Box;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  badge?: string;
};

const CAMPAIGN_OPTIONS: CampaignOption[] = [
  {
    id: "cold-outbound",
    icon: Box,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    title: "Cold outbound campaign",
    description: "Reaching out to net new cold leads",
    badge: "Popular",
  },
  {
    id: "warm-outbound",
    icon: Flame,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    title: "Warm outbound campaign",
    description: "Reaching out to leads within your CRM",
  },
  {
    id: "cross-sell",
    icon: TrendingUp,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Cross-sell/upsell campaign",
    description: "Cross-sell or upsell your existing customer base",
  },
  {
    id: "website-visitor",
    icon: Globe,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    title: "Website visitor campaign",
    description: "De-anonymize and sequence your website visitors",
  },
  {
    id: "intent-signals",
    icon: Target,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    title: "Intent signals campaign",
    description: "Find timely net new prospects with intent signals",
  },
];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-50 text-green-700 ring-1 ring-green-200",
  paused: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  completed: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

/* ---------- page ---------- */

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  /* modal state */
  const [modalState, setModalState] = useState<ModalState>("closed");
  const [selectedType, setSelectedType] = useState<CampaignOption | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  /* three-dot menu */
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  /* archive confirmation modal */
  const [archiveTarget, setArchiveTarget] = useState<Campaign | null>(null);
  const [archiving, setArchiving] = useState(false);

  /* reactivate-stale-leads modal */
  const [reactivateTarget, setReactivateTarget] = useState<Campaign | null>(
    null
  );
  const [reactivateDays, setReactivateDays] = useState("60");
  const [reactivateStatuses, setReactivateStatuses] = useState<Set<string>>(
    new Set(["not_interested", "no_response"])
  );
  const [reactivating, setReactivating] = useState(false);

  /* automated triggers */
  type CampaignTrigger = {
    id: string;
    campaignId: string;
    campaignName: string | null;
    triggerType: string;
    threshold: number;
    enabled: boolean;
    lastFiredAt: string | null;
    createdAt: string;
  };
  const [triggers, setTriggers] = useState<CampaignTrigger[]>([]);
  const [triggersOpen, setTriggersOpen] = useState(false);
  const [triggersLoading, setTriggersLoading] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [newTriggerCampaignId, setNewTriggerCampaignId] = useState("");
  const [newTriggerType, setNewTriggerType] =
    useState<string>("subscription_days_old");
  const [newTriggerThreshold, setNewTriggerThreshold] = useState("30");
  const [creatingTrigger, setCreatingTrigger] = useState(false);

  /* search */
  const [searchQuery, setSearchQuery] = useState("");

  /* filters panel */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set(["all"]));
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [filterDateRange, setFilterDateRange] = useState("all-time");
  const [filterMinReplies, setFilterMinReplies] = useState("");
  const [filterMaxReplies, setFilterMaxReplies] = useState("");
  const [filterMinMeetings, setFilterMinMeetings] = useState("");
  const [filterMaxMeetings, setFilterMaxMeetings] = useState("");
  const [appliedFilterCount, setAppliedFilterCount] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({
    statuses: new Set<string>(["all"]),
    types: new Set<string>(),
    dateRange: "all-time",
    minReplies: "",
    maxReplies: "",
    minMeetings: "",
    maxMeetings: "",
  });

  /* ---- data fetching ---- */

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch everything (including archived) once and apply status/type/
      // date/performance filtering client-side — matches how the other
      // filter dimensions already work in this page.
      const res = await fetch("/api/campaigns?status=all");
      if (!res.ok) throw new Error("Failed to load campaigns");
      const json = await res.json();
      setCampaigns(json.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load campaigns";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  /* close menu on outside click */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---- modal helpers ---- */

  function openModal() {
    setModalState("step1");
    setSelectedType(null);
    setCampaignName("");
    setCreateError("");
  }

  function closeModal() {
    setModalState("closed");
    setSelectedType(null);
    setCampaignName("");
    setCreateError("");
  }

  function handleSelectType(option: CampaignOption) {
    setSelectedType(option);
    setCampaignName(`${option.title} 1`);
    setModalState("step2");
    setCreateError("");
  }

  async function handleCreate() {
    if (!campaignName.trim()) {
      setCreateError("Campaign name is required");
      return;
    }
    setSubmitting(true);
    setCreateError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          status: "draft",
          type: selectedType?.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      const json = await res.json();
      toast.success("Campaign created");
      closeModal();
      if (json.data?.id) {
        router.push(`/campaigns/${json.data.id}`);
        return;
      }
      loadCampaigns();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create campaign"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- campaign actions ---- */

  async function handleToggleApproval(c: Campaign, next: boolean) {
    // Optimistic — flip locally, revert on failure.
    setCampaigns((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, requireApproval: next } : x))
    );
    try {
      const res = await fetch(`/api/campaigns/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireApproval: next }),
      });
      if (!res.ok) throw new Error("Failed to update approval mode");
      toast.success(
        next
          ? "Approval required before send"
          : "Approval no longer required"
      );
    } catch (err) {
      // Revert
      setCampaigns((prev) =>
        prev.map((x) =>
          x.id === c.id ? { ...x, requireApproval: !next } : x
        )
      );
      toast.error(
        err instanceof Error ? err.message : "Failed to update approval mode"
      );
    }
  }

  async function handleDuplicate(c: Campaign) {
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/campaigns/${c.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate campaign");
      toast.success("Campaign duplicated");
      loadCampaigns();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to duplicate campaign"
      );
    }
  }

  function openArchiveConfirm(c: Campaign) {
    setOpenMenuId(null);
    setArchiveTarget(c);
  }

  function openReactivateModal(c: Campaign) {
    setOpenMenuId(null);
    setReactivateTarget(c);
    setReactivateDays("60");
    setReactivateStatuses(new Set(["not_interested", "no_response"]));
  }

  function toggleReactivateStatus(id: string) {
    setReactivateStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmReactivate() {
    if (!reactivateTarget) return;
    const days = Number(reactivateDays);
    if (!Number.isFinite(days) || days <= 0) {
      toast.error("Days threshold must be a positive number");
      return;
    }
    if (reactivateStatuses.size === 0) {
      toast.error("Pick at least one lead status");
      return;
    }
    setReactivating(true);
    try {
      const res = await fetch(
        `/api/campaigns/${reactivateTarget.id}/reactivate-stale-leads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staleAfterDays: days,
            fromStatuses: Array.from(reactivateStatuses),
          }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Failed to reactivate leads"
        );
      }
      const json = (await res.json()) as { enrolled: number };
      toast.success(
        json.enrolled === 0
          ? "No stale leads matched the criteria"
          : `Enrolled ${json.enrolled} stale lead${
              json.enrolled === 1 ? "" : "s"
            }`
      );
      setReactivateTarget(null);
      loadCampaigns();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reactivate leads"
      );
    } finally {
      setReactivating(false);
    }
  }

  /* ---- automated triggers ---- */

  const loadTriggers = useCallback(async () => {
    setTriggersLoading(true);
    try {
      const res = await fetch("/api/campaign-triggers");
      if (!res.ok) throw new Error("Failed to load triggers");
      const json = (await res.json()) as { data: CampaignTrigger[] };
      setTriggers(json.data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load triggers"
      );
    } finally {
      setTriggersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (triggersOpen && triggers.length === 0 && !triggersLoading) {
      loadTriggers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggersOpen]);

  async function handleCreateTrigger() {
    if (!newTriggerCampaignId) {
      toast.error("Pick a campaign");
      return;
    }
    const threshold = Number(newTriggerThreshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
      toast.error("Threshold must be a non-negative number");
      return;
    }
    setCreatingTrigger(true);
    try {
      const res = await fetch("/api/campaign-triggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: newTriggerCampaignId,
          triggerType: newTriggerType,
          threshold,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Failed to create trigger"
        );
      }
      toast.success("Trigger created");
      setShowTriggerModal(false);
      setNewTriggerCampaignId("");
      setNewTriggerThreshold("30");
      setNewTriggerType("subscription_days_old");
      loadTriggers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create trigger"
      );
    } finally {
      setCreatingTrigger(false);
    }
  }

  async function handleToggleTrigger(t: CampaignTrigger) {
    try {
      const res = await fetch(`/api/campaign-triggers/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !t.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update trigger");
      const json = (await res.json()) as { data: CampaignTrigger };
      setTriggers((prev) =>
        prev.map((x) =>
          x.id === t.id ? { ...x, enabled: json.data.enabled } : x
        )
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update trigger"
      );
    }
  }

  async function handleDeleteTrigger(t: CampaignTrigger) {
    try {
      const res = await fetch(`/api/campaign-triggers/${t.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete trigger");
      setTriggers((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Trigger deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete trigger"
      );
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/campaigns/${archiveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error("Failed to archive campaign");
      setCampaigns((prev) => prev.filter((x) => x.id !== archiveTarget.id));
      toast.success("Campaign archived");
      setArchiveTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive campaign"
      );
    } finally {
      setArchiving(false);
    }
  }

  /* ---- filtering ---- */
  const DATE_RANGE_DAYS: Record<string, number> = {
    "last-7": 7,
    "last-30": 30,
    "last-90": 90,
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name.toLowerCase().includes(q)) return false;
    }

    const status = c.status ?? "draft";
    if (appliedFilters.statuses.has("all")) {
      // "All" mirrors every mailbox-style UI (e.g. Gmail's "All Mail"
      // excludes Trash) — archived campaigns only show when explicitly
      // selected below, so they don't silently reappear in the main view.
      if (status === "archived") return false;
    } else if (!appliedFilters.statuses.has(status)) {
      return false;
    }

    if (appliedFilters.types.size > 0 && !appliedFilters.types.has(c.type ?? ""))
      return false;

    const days = DATE_RANGE_DAYS[appliedFilters.dateRange];
    if (days && c.createdAt) {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      if (new Date(c.createdAt).getTime() < cutoff) return false;
    }

    const replies = c.totalReplies ?? 0;
    if (appliedFilters.minReplies && replies < Number(appliedFilters.minReplies))
      return false;
    if (appliedFilters.maxReplies && replies > Number(appliedFilters.maxReplies))
      return false;

    const meetings = c.meetingsBooked ?? 0;
    if (
      appliedFilters.minMeetings &&
      meetings < Number(appliedFilters.minMeetings)
    )
      return false;
    if (
      appliedFilters.maxMeetings &&
      meetings > Number(appliedFilters.maxMeetings)
    )
      return false;

    return true;
  });

  function applyFilters() {
    let count = 0;
    if (!filterStatuses.has("all")) count += filterStatuses.size;
    if (filterTypes.size > 0) count += filterTypes.size;
    if (filterDateRange !== "all-time") count += 1;
    if (filterMinReplies || filterMaxReplies) count += 1;
    if (filterMinMeetings || filterMaxMeetings) count += 1;
    setAppliedFilterCount(count);
    setAppliedFilters({
      statuses: new Set(filterStatuses),
      types: new Set(filterTypes),
      dateRange: filterDateRange,
      minReplies: filterMinReplies,
      maxReplies: filterMaxReplies,
      minMeetings: filterMinMeetings,
      maxMeetings: filterMaxMeetings,
    });
    setFiltersOpen(false);
  }

  function clearFilters() {
    setFilterStatuses(new Set(["all"]));
    setFilterTypes(new Set());
    setFilterDateRange("all-time");
    setFilterMinReplies("");
    setFilterMaxReplies("");
    setFilterMinMeetings("");
    setFilterMaxMeetings("");
    setAppliedFilterCount(0);
    setAppliedFilters({
      statuses: new Set(["all"]),
      types: new Set(),
      dateRange: "all-time",
      minReplies: "",
      maxReplies: "",
      minMeetings: "",
      maxMeetings: "",
    });
  }

  function toggleFilterStatus(id: string) {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (id === "all") return new Set(["all"]);
      next.delete("all");
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) return new Set(["all"]);
      return next;
    });
  }

  function toggleFilterType(id: string) {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {campaigns.length === 0 ? (
        /* ========== EMPTY STATE ========== */
        <div className="relative flex items-center justify-center min-h-[70vh] overflow-hidden">
          {/* blurred background pattern */}
          <div className="absolute inset-0" style={{ filter: "blur(8px)" }}>
            {/* circles */}
            <div className="absolute top-[15%] left-[10%] w-16 h-16 rounded-full bg-violet-200 opacity-20" />
            <div className="absolute top-[25%] left-[30%] w-10 h-10 rounded-full bg-gray-300 opacity-20" />
            <div className="absolute top-[10%] right-[20%] w-14 h-14 rounded-full bg-violet-300 opacity-20" />
            <div className="absolute top-[50%] left-[20%] w-12 h-12 rounded-full bg-violet-200 opacity-20" />
            <div className="absolute top-[40%] right-[15%] w-10 h-10 rounded-full bg-gray-200 opacity-20" />
            <div className="absolute bottom-[20%] left-[40%] w-16 h-16 rounded-full bg-violet-100 opacity-20" />
            <div className="absolute bottom-[30%] right-[30%] w-8 h-8 rounded-full bg-violet-300 opacity-20" />
            <div className="absolute top-[60%] right-[40%] w-12 h-12 rounded-full bg-gray-300 opacity-20" />
            {/* connecting lines */}
            <div className="absolute top-[20%] left-[15%] w-[200px] h-[1px] bg-violet-200 opacity-20 rotate-[30deg]" />
            <div className="absolute top-[30%] left-[35%] w-[180px] h-[1px] bg-gray-300 opacity-20 -rotate-[20deg]" />
            <div className="absolute top-[45%] right-[25%] w-[150px] h-[1px] bg-violet-200 opacity-20 rotate-[15deg]" />
            <div className="absolute bottom-[35%] left-[25%] w-[220px] h-[1px] bg-violet-300 opacity-20 -rotate-[10deg]" />
            <div className="absolute top-[55%] left-[45%] w-[160px] h-[1px] bg-gray-200 opacity-20 rotate-[40deg]" />
          </div>

          {/* center content */}
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            <h2 className="text-xl font-bold text-gray-900">
              Get started with campaigns!
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-md">
              Create your first campaign to automate outreach and connect with
              your leads.
            </p>
            <button
              onClick={openModal}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a39dd] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create campaign
            </button>
          </div>
        </div>
      ) : (
        /* ========== CAMPAIGNS LIST ========== */
        <div className="space-y-6">
          {/* header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing {filteredCampaigns.length} of {campaigns.length} campaigns
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
              </div>
              <button
                onClick={() => setFiltersOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  appliedFilterCount > 0
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {appliedFilterCount > 0 && (
                  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                    {appliedFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a39dd] transition-colors"
              >
                <Plus className="h-4 w-4" />
                New campaign
              </button>
            </div>
          </div>

          {/* campaign cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((c) => {
              const totalLeads = c.totalLeads ?? 0;
              const sent = c.emailsSent ?? 0;
              const replies = c.totalReplies ?? 0;
              const meetings = c.meetingsBooked ?? 0;

              return (
                <div
                  key={c.id}
                  className="relative rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all"
                >
                  {/* top row: name + menu */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-1">
                      {c.name}
                    </h3>

                    {/* three-dot menu */}
                    <div
                      className="relative"
                      ref={openMenuId === c.id ? menuRef : undefined}
                    >
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === c.id ? null : c.id)
                        }
                        className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openMenuId === c.id && (
                        <div className="absolute right-0 top-8 z-20 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={() => handleDuplicate(c)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => openReactivateModal(c)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reactivate stale leads
                          </button>
                          <button
                            onClick={() => openArchiveConfirm(c)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* badges row */}
                  <div className="flex items-center gap-2 mb-4">
                    {c.type && (
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700">
                        {c.type}
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                        STATUS_BADGE[c.status ?? "draft"] ??
                          "bg-gray-100 text-gray-600"
                      )}
                    >
                      {c.status ?? "draft"}
                    </span>
                  </div>

                  {/* stats row */}
                  <div className="grid grid-cols-4 gap-1 pt-3 border-t border-gray-100">
                    {[
                      { label: "Leads", value: totalLeads, icon: Users },
                      { label: "Sent", value: sent, icon: Send },
                      { label: "Replies", value: replies, icon: MessageSquare },
                      { label: "Meetings", value: meetings, icon: Target },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <m.icon className="h-3.5 w-3.5 mx-auto mb-0.5 text-gray-400" />
                        <p className="text-sm font-bold text-gray-900">
                          {m.value}
                        </p>
                        <p className="text-[10px] text-gray-400">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Build link */}
                  <div className="mt-3">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition"
                    >
                      <ChevronRight className="h-3.5 w-3.5" /> Open builder
                    </Link>
                  </div>

                  {/* require-approval toggle */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 leading-tight">
                        Require approval before send
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                        Route drafts to Tasks for review
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(c.requireApproval)}
                      aria-label="Require approval before send"
                      onClick={() =>
                        handleToggleApproval(c, !c.requireApproval)
                      }
                      className={cn(
                        "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors",
                        c.requireApproval
                          ? "bg-[#6C47FF]"
                          : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                          c.requireApproval ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========== AUTOMATED TRIGGERS ========== */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setTriggersOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Automated triggers
                  </p>
                  <p className="text-xs text-gray-500">
                    Auto-enroll into a campaign when a customer milestone
                    fires (subscription age, credits used).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {triggers.length}{" "}
                  {triggers.length === 1 ? "trigger" : "triggers"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    triggersOpen && "rotate-180"
                  )}
                />
              </div>
            </button>
            {triggersOpen && (
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">
                    Firing enrolls leads into the target campaign. Manual
                    triggers are fired from a workflow you build.
                  </p>
                  <button
                    onClick={() => {
                      setNewTriggerCampaignId(
                        campaigns.find((c) => c.status !== "archived")?.id ?? ""
                      );
                      setShowTriggerModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#6C47FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5a39dd] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New trigger
                  </button>
                </div>
                {triggersLoading ? (
                  <div className="py-6 text-center text-sm text-gray-400">
                    Loading…
                  </div>
                ) : triggers.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">
                    No triggers configured yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                    {triggers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 px-3 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {t.campaignName ?? "(deleted campaign)"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-mono">{t.triggerType}</span>{" "}
                            when threshold ≥{" "}
                            <span className="font-semibold">
                              {t.threshold}
                              {t.triggerType === "credits_used_pct" ? "%" : ""}
                              {t.triggerType === "subscription_days_old"
                                ? " days"
                                : ""}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleTrigger(t)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0",
                            t.enabled ? "bg-violet-600" : "bg-gray-200"
                          )}
                          aria-label={
                            t.enabled ? "Disable trigger" : "Enable trigger"
                          }
                        >
                          <span
                            className={cn(
                              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                              t.enabled ? "translate-x-5" : "translate-x-[3px]"
                            )}
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteTrigger(t)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          aria-label="Delete trigger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== NEW TRIGGER MODAL ========== */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New trigger</h2>
              <button
                onClick={() => setShowTriggerModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Campaign to enroll
                </label>
                <select
                  value={newTriggerCampaignId}
                  onChange={(e) => setNewTriggerCampaignId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 h-11 px-3 text-sm text-gray-900 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none"
                >
                  <option value="">Select a campaign…</option>
                  {campaigns
                    .filter((c) => c.status !== "archived")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Trigger type
                </label>
                <select
                  value={newTriggerType}
                  onChange={(e) => setNewTriggerType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 h-11 px-3 text-sm text-gray-900 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none"
                >
                  <option value="subscription_days_old">
                    Subscription age (days)
                  </option>
                  <option value="credits_used_pct">
                    Credits used (% of monthly allotment)
                  </option>
                  <option value="manual">Manual (fired from a workflow)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={newTriggerThreshold}
                  onChange={(e) => setNewTriggerThreshold(e.target.value)}
                  disabled={newTriggerType === "manual"}
                  className="w-full rounded-lg border border-gray-200 h-11 px-3 text-sm text-gray-900 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  {newTriggerType === "subscription_days_old" &&
                    "Fires when the account has been on its current plan for at least this many days."}
                  {newTriggerType === "credits_used_pct" &&
                    "Fires when leads-used / leads-limit crosses this percentage (0-100)."}
                  {newTriggerType === "manual" &&
                    "Manual triggers don't fire on a threshold — they're kicked off by a workflow."}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowTriggerModal(false)}
                disabled={creatingTrigger}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTrigger}
                disabled={creatingTrigger}
                className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors disabled:opacity-40 inline-flex items-center gap-2"
              >
                {creatingTrigger && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {creatingTrigger ? "Creating…" : "Create trigger"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== REACTIVATE STALE LEADS MODAL ========== */}
      {reactivateTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Reactivate stale leads
              </h2>
              <button
                onClick={() => setReactivateTarget(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <p className="text-sm text-gray-500">
                Move every stale lead into{" "}
                <span className="font-semibold text-gray-700">
                  {reactivateTarget.name}
                </span>{" "}
                and reset its status to <span className="font-mono">new</span>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Stale after (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={reactivateDays}
                  onChange={(e) => setReactivateDays(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 h-11 px-4 text-sm text-gray-900 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none transition"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Leads whose last contact was more than this many days ago
                  will be included.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From statuses
                </label>
                <div className="space-y-2">
                  {[
                    { id: "not_interested", label: "Not interested" },
                    { id: "no_response", label: "No response" },
                    { id: "closed_lost", label: "Closed lost" },
                    { id: "unqualified", label: "Unqualified" },
                  ].map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={reactivateStatuses.has(s.id)}
                        onChange={() => toggleReactivateStatus(s.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                      />
                      <span className="text-sm text-gray-700">{s.label}</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {s.id}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setReactivateTarget(null)}
                disabled={reactivating}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReactivate}
                disabled={reactivating}
                className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors disabled:opacity-40 inline-flex items-center gap-2"
              >
                {reactivating && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {reactivating ? "Enrolling…" : "Enroll stale leads"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ARCHIVE CONFIRMATION MODAL ========== */}
      {archiveTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Archive campaign?
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This campaign will be moved to archives.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={archiving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {archiving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== NEW CAMPAIGN MODAL ========== */}
      {modalState !== "closed" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl mx-4">
            {/* modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New campaign</h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* STEP 1: campaign type selection */}
            {modalState === "step1" && (
              <div>
                {CAMPAIGN_OPTIONS.map((option, idx) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectType(option)}
                    className={cn(
                      "flex w-full items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors",
                      idx < CAMPAIGN_OPTIONS.length - 1 &&
                        "border-b border-gray-100"
                    )}
                  >
                    {/* icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 p-2 rounded-lg",
                        option.iconBg
                      )}
                    >
                      <option.icon
                        className={cn("h-5 w-5", option.iconColor)}
                      />
                    </div>

                    {/* text */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {option.title}
                        </span>
                        {option.badge && (
                          <span className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 text-xs px-2 py-0.5">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    </div>

                    {/* chevron */}
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            {/* STEP 2: name input */}
            {modalState === "step2" && (
              <div className="px-6 py-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => {
                    setCampaignName(e.target.value);
                    setCreateError("");
                  }}
                  className={cn(
                    "w-full rounded-lg border h-11 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none transition",
                    createError ? "border-red-300" : "border-gray-200"
                  )}
                  placeholder="Campaign name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submitting) handleCreate();
                  }}
                />
                {createError && (
                  <p className="mt-1.5 text-xs text-red-600">{createError}</p>
                )}
              </div>
            )}

            {/* STEP 2 footer */}
            {modalState === "step2" && (
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setModalState("step1")}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || !campaignName.trim()}
                  className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== FILTERS SLIDE-IN PANEL ========== */}
      {filtersOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-[380px] bg-white shadow-xl flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status</p>
                <div className="space-y-2">
                  {[
                    { id: "all", label: "All", dot: null },
                    { id: "active", label: "Active", dot: "bg-green-500" },
                    { id: "paused", label: "Paused", dot: "bg-yellow-500" },
                    { id: "draft", label: "Draft", dot: "bg-gray-400" },
                    { id: "archived", label: "Archived", dot: "bg-red-500" },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterStatuses.has(opt.id)}
                        onChange={() => toggleFilterStatus(opt.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                      />
                      {opt.dot && <span className={`h-2 w-2 rounded-full ${opt.dot}`} />}
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Campaign type */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Campaign type</p>
                <div className="space-y-2">
                  {[
                    { id: "cold-outbound", label: "Cold outbound" },
                    { id: "warm-outbound", label: "Warm outbound" },
                    { id: "cross-sell", label: "Cross-sell/upsell" },
                    { id: "website-visitor", label: "Website visitor" },
                    { id: "intent-signals", label: "Intent signals" },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterTypes.has(opt.id)}
                        onChange={() => toggleFilterType(opt.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date created */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Date created</p>
                <div className="space-y-2">
                  {[
                    { id: "last-7", label: "Last 7 days" },
                    { id: "last-30", label: "Last 30 days" },
                    { id: "last-90", label: "Last 3 months" },
                    { id: "all-time", label: "All time" },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="date-range"
                        checked={filterDateRange === opt.id}
                        onChange={() => setFilterDateRange(opt.id)}
                        className="h-4 w-4 border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Performance */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Performance</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Positive replies</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterMinReplies}
                        onChange={(e) => setFilterMinReplies(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                      />
                      <span className="text-gray-400 text-sm">–</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterMaxReplies}
                        onChange={(e) => setFilterMaxReplies(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Meetings booked</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterMinMeetings}
                        onChange={(e) => setFilterMinMeetings(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                      />
                      <span className="text-gray-400 text-sm">–</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterMaxMeetings}
                        onChange={(e) => setFilterMaxMeetings(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 ml-4 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
