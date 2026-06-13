"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Mail,
  Trash2,
  Play,
  Pause,
  X,
  Eye,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Users,
  Send,
  MessageSquare,
  Target,
  Clock,
} from "lucide-react";
import { cn, STATUS_COLOR } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/* ---------- types ---------- */

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  totalLeads: number | null;
  emailsSent: number | null;
  totalReplies: number | null;
  meetingsBooked: number | null;
  channels: string[] | null;
  createdAt?: string | null;
};

type SequenceStep = {
  day: number;
  channel: "Email" | "LinkedIn" | "WhatsApp";
  template: string;
};

type WizardData = {
  /* step 1 */
  name: string;
  description: string;
  goal: string;
  /* step 2 */
  industries: string;
  jobTitles: string;
  companySize: string;
  locations: string;
  /* step 3 */
  steps: SequenceStep[];
  /* step 4 */
  fromEmail: string;
  dailyLimit: number;
  sendStart: string;
  sendEnd: string;
};

const INITIAL_WIZARD: WizardData = {
  name: "",
  description: "",
  goal: "Book Meeting",
  industries: "",
  jobTitles: "",
  companySize: "",
  locations: "",
  steps: [{ day: 1, channel: "Email", template: "" }],
  fromEmail: "",
  dailyLimit: 50,
  sendStart: "09:00",
  sendEnd: "17:00",
};

const WIZARD_TITLES = ["Basics", "Lead Targeting", "Sequence Builder", "Sender Setup", "Review"];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-50 text-green-700 ring-1 ring-green-200",
  paused: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  completed: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

/* ---------- helpers ---------- */

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- page ---------- */

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* wizard state */
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizard, setWizard] = useState<WizardData>({ ...INITIAL_WIZARD });
  const [submitting, setSubmitting] = useState(false);

  /* delete confirmation */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---- data fetching ---- */

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to load campaigns");
      const json = await res.json();
      setCampaigns(json.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load campaigns";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  /* ---- campaign actions ---- */

  async function handleToggleStatus(c: Campaign) {
    const newStatus = c.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/campaigns/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      const json = await res.json();
      setCampaigns((prev) =>
        prev.map((x) => (x.id === c.id ? json.data : x))
      );
      toast.success(
        `Campaign ${newStatus === "active" ? "resumed" : "paused"}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update campaign"
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete campaign");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete campaign"
      );
    } finally {
      setDeleteId(null);
    }
  }

  /* ---- wizard helpers ---- */

  function openWizard() {
    setWizard({ ...INITIAL_WIZARD });
    setWizardStep(0);
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
    setWizardStep(0);
  }

  function updateWizard<K extends keyof WizardData>(key: K, val: WizardData[K]) {
    setWizard((prev) => ({ ...prev, [key]: val }));
  }

  function addStep() {
    const last = wizard.steps[wizard.steps.length - 1];
    updateWizard("steps", [
      ...wizard.steps,
      { day: (last?.day ?? 0) + 2, channel: "Email", template: "" },
    ]);
  }

  function removeStep(idx: number) {
    if (wizard.steps.length <= 1) return;
    updateWizard(
      "steps",
      wizard.steps.filter((_, i) => i !== idx)
    );
  }

  function updateStep(idx: number, field: keyof SequenceStep, val: string | number) {
    const updated = wizard.steps.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    updateWizard("steps", updated);
  }

  function canProceed(): boolean {
    if (wizardStep === 0) return wizard.name.trim().length > 0;
    return true;
  }

  async function handleLaunch() {
    if (!wizard.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizard.name,
          description: wizard.description || undefined,
          goal: wizard.goal,
          industries: wizard.industries || undefined,
          jobTitles: wizard.jobTitles || undefined,
          companySize: wizard.companySize || undefined,
          locations: wizard.locations || undefined,
          steps: wizard.steps,
          fromEmail: wizard.fromEmail || undefined,
          dailyLimit: wizard.dailyLimit,
          sendStart: wizard.sendStart,
          sendEnd: wizard.sendEnd,
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      const json = await res.json();
      setCampaigns((prev) => [json.data, ...prev]);
      toast.success("Campaign created");
      closeWizard();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create campaign"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- shared input classes ---------- */

  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/40 focus:border-[#6C47FF] transition";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

  /* ---------- render ---------- */

  return (
    <>
      <div className="space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openWizard}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a39dd] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>

        {/* content */}
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
            {error}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-center">
            <div className="rounded-full bg-[#6C47FF]/10 p-4 mb-4">
              <Mail className="h-8 w-8 text-[#6C47FF]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              No campaigns yet
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-sm">
              Create your first campaign to start reaching out to leads
              automatically.
            </p>
            <button
              onClick={openWizard}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Campaign
            </button>
          </div>
        ) : (
          /* ---- campaign grid ---- */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => {
              const totalLeads = c.totalLeads ?? 0;
              const sent = c.emailsSent ?? 0;
              const replies = c.totalReplies ?? 0;
              const meetings = c.meetingsBooked ?? 0;
              const progress =
                totalLeads > 0
                  ? Math.min(100, Math.round((sent / totalLeads) * 100))
                  : 0;

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md hover:border-[#6C47FF]/30 transition-all group"
                >
                  {/* status + name */}
                  <div className="flex items-start justify-between mb-3">
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

                  <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-1 mb-1">
                    {c.name}
                  </h3>

                  <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(c.createdAt)}
                  </p>

                  {/* metrics row */}
                  <div className="grid grid-cols-4 gap-1 mb-4">
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

                  {/* progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>
                        {sent} / {totalLeads} sent
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#6C47FF] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* action buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Link>

                    {c.status !== "completed" && (
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                          c.status === "active"
                            ? "text-yellow-700 hover:bg-yellow-50"
                            : "text-[#6C47FF] hover:bg-[#6C47FF]/5"
                        )}
                      >
                        {c.status === "active" ? (
                          <>
                            <Pause className="h-3 w-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Resume
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="ml-auto inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========== delete confirmation dialog ========== */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete campaign?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. All associated data will be
              permanently removed.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== new campaign wizard modal ========== */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl mx-4 flex flex-col overflow-hidden">
            {/* wizard header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  New Campaign
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Step {wizardStep + 1} of {WIZARD_TITLES.length} &mdash;{" "}
                  {WIZARD_TITLES[wizardStep]}
                </p>
              </div>
              <button
                onClick={closeWizard}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* stepper bar */}
            <div className="flex gap-1 px-6 pt-4">
              {WIZARD_TITLES.map((t, i) => (
                <div key={t} className="flex-1">
                  <div
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      i <= wizardStep ? "bg-[#6C47FF]" : "bg-gray-200"
                    )}
                  />
                </div>
              ))}
            </div>

            {/* wizard body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Step 0: Basics */}
              {wizardStep === 0 && (
                <>
                  <div>
                    <label className={labelCls}>Campaign Name *</label>
                    <input
                      value={wizard.name}
                      onChange={(e) => updateWizard("name", e.target.value)}
                      className={inputCls}
                      placeholder="Q1 Outbound - SaaS Founders"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea
                      value={wizard.description}
                      onChange={(e) =>
                        updateWizard("description", e.target.value)
                      }
                      rows={3}
                      className={inputCls}
                      placeholder="Brief description of campaign goals and audience"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Goal</label>
                    <select
                      value={wizard.goal}
                      onChange={(e) => updateWizard("goal", e.target.value)}
                      className={inputCls}
                    >
                      <option value="Book Meeting">Book Meeting</option>
                      <option value="Drive Traffic">Drive Traffic</option>
                      <option value="Brand Awareness">Brand Awareness</option>
                    </select>
                  </div>
                </>
              )}

              {/* Step 1: Lead Targeting */}
              {wizardStep === 1 && (
                <>
                  <div>
                    <label className={labelCls}>Industries</label>
                    <input
                      value={wizard.industries}
                      onChange={(e) =>
                        updateWizard("industries", e.target.value)
                      }
                      className={inputCls}
                      placeholder="SaaS, FinTech, HealthTech (comma-separated)"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Job Titles</label>
                    <input
                      value={wizard.jobTitles}
                      onChange={(e) =>
                        updateWizard("jobTitles", e.target.value)
                      }
                      className={inputCls}
                      placeholder="CEO, CTO, VP Sales (comma-separated)"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Company Size</label>
                    <select
                      value={wizard.companySize}
                      onChange={(e) =>
                        updateWizard("companySize", e.target.value)
                      }
                      className={inputCls}
                    >
                      <option value="">Any size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-1000">201-1,000 employees</option>
                      <option value="1001+">1,001+ employees</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Locations</label>
                    <input
                      value={wizard.locations}
                      onChange={(e) =>
                        updateWizard("locations", e.target.value)
                      }
                      className={inputCls}
                      placeholder="US, UK, India (comma-separated)"
                    />
                  </div>
                </>
              )}

              {/* Step 2: Sequence Builder */}
              {wizardStep === 2 && (
                <>
                  <div className="space-y-3">
                    {wizard.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#6C47FF]">
                            Step {idx + 1}
                          </span>
                          {wizard.steps.length > 1 && (
                            <button
                              onClick={() => removeStep(idx)}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Day</label>
                            <input
                              type="number"
                              min={1}
                              value={step.day}
                              onChange={(e) =>
                                updateStep(
                                  idx,
                                  "day",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Channel</label>
                            <select
                              value={step.channel}
                              onChange={(e) =>
                                updateStep(idx, "channel", e.target.value)
                              }
                              className={inputCls}
                            >
                              <option value="Email">Email</option>
                              <option value="LinkedIn">LinkedIn</option>
                              <option value="WhatsApp">WhatsApp</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Template</label>
                          <textarea
                            value={step.template}
                            onChange={(e) =>
                              updateStep(idx, "template", e.target.value)
                            }
                            rows={3}
                            className={inputCls}
                            placeholder={`Hi {{firstName}}, ...`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6C47FF] hover:text-[#5a39dd] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </button>
                </>
              )}

              {/* Step 3: Sender Setup */}
              {wizardStep === 3 && (
                <>
                  <div>
                    <label className={labelCls}>From Email</label>
                    <input
                      value={wizard.fromEmail}
                      onChange={(e) =>
                        updateWizard("fromEmail", e.target.value)
                      }
                      className={inputCls}
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Daily Send Limit: {wizard.dailyLimit}
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={wizard.dailyLimit}
                      onChange={(e) =>
                        updateWizard("dailyLimit", parseInt(e.target.value))
                      }
                      className="w-full accent-[#6C47FF] h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>10</span>
                      <span>100</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Send Window Start</label>
                      <select
                        value={wizard.sendStart}
                        onChange={(e) =>
                          updateWizard("sendStart", e.target.value)
                        }
                        className={inputCls}
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const t = `${String(i).padStart(2, "0")}:00`;
                          return (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Send Window End</label>
                      <select
                        value={wizard.sendEnd}
                        onChange={(e) =>
                          updateWizard("sendEnd", e.target.value)
                        }
                        className={inputCls}
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const t = `${String(i).padStart(2, "0")}:00`;
                          return (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Review */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  {/* basics */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Campaign Basics
                    </h4>
                    <p className="text-sm font-semibold text-gray-900">
                      {wizard.name}
                    </p>
                    {wizard.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {wizard.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Goal: {wizard.goal}
                    </p>
                  </div>

                  {/* targeting */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Lead Targeting
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400">Industries:</span>{" "}
                        {wizard.industries || "Any"}
                      </div>
                      <div>
                        <span className="text-gray-400">Titles:</span>{" "}
                        {wizard.jobTitles || "Any"}
                      </div>
                      <div>
                        <span className="text-gray-400">Size:</span>{" "}
                        {wizard.companySize || "Any"}
                      </div>
                      <div>
                        <span className="text-gray-400">Locations:</span>{" "}
                        {wizard.locations || "Any"}
                      </div>
                    </div>
                  </div>

                  {/* sequence */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Sequence ({wizard.steps.length} step
                      {wizard.steps.length !== 1 ? "s" : ""})
                    </h4>
                    <div className="space-y-1">
                      {wizard.steps.map((s, i) => (
                        <p key={i} className="text-xs text-gray-600">
                          Day {s.day} &mdash; {s.channel}
                          {s.template
                            ? `: "${s.template.slice(0, 60)}${s.template.length > 60 ? "..." : ""}"`
                            : ""}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* sender */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Sender Setup
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400">From:</span>{" "}
                        {wizard.fromEmail || "Not set"}
                      </div>
                      <div>
                        <span className="text-gray-400">Daily limit:</span>{" "}
                        {wizard.dailyLimit}
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Send window:</span>{" "}
                        {wizard.sendStart} &ndash; {wizard.sendEnd}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* wizard footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={wizardStep === 0 ? closeWizard : () => setWizardStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {wizardStep === 0 ? "Cancel" : "Back"}
              </button>

              {wizardStep < WIZARD_TITLES.length - 1 ? (
                <button
                  onClick={() => setWizardStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleLaunch}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Launching..." : "Launch Campaign"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
