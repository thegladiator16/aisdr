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
} from "lucide-react";
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

  /* ---- data fetching ---- */

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
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
        body: JSON.stringify({ name: campaignName.trim(), status: "draft" }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      toast.success("Campaign created");
      closeModal();
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

  async function handleDuplicate(c: Campaign) {
    setOpenMenuId(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${c.name} (copy)`,
          status: "draft",
        }),
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
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a39dd] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New campaign
            </button>
          </div>

          {/* campaign cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => {
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
                        <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={() => handleDuplicate(c)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== ARCHIVE CONFIRMATION MODAL ========== */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
    </>
  );
}
