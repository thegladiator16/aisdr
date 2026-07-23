"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRight,
  Target,
  GitBranch,
  MessageSquare,
  Settings,
  Rocket,
  Plus,
  Trash2,
  Mail,
  Phone,
  ClipboardList,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  ArrowRight,
  Clock,
  X,
  Check,
  Send,
  BarChart2,
  Users,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── types ── */
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
  subject?: string | null;
  body?: string | null;
  tone?: string | null;
  language?: string | null;
  dailyLimit?: number | null;
  sendDays?: string[] | null;
};

type SequenceStep = {
  id: string;
  stepNumber: number;
  channel: "email" | "linkedin_connection" | "linkedin_dm" | "whatsapp" | "manual_task" | "human_call";
  delayDays: number;
  subject?: string;
  body?: string;
  condition: "always" | "if_no_reply" | "if_opened";
};

type List = { id: string; name: string; leadsCount?: number };

type Tab = "targeting" | "sequence" | "messaging" | "settings";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "targeting", label: "Targeting", icon: Target },
  { id: "sequence", label: "Sequence", icon: GitBranch },
  { id: "messaging", label: "Messaging", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

const CHANNEL_META = {
  email: { label: "Email", icon: Mail, color: "bg-violet-100 text-violet-700" },
  human_call: { label: "Human call", icon: Phone, color: "bg-green-100 text-green-700" },
  manual_task: { label: "Manual task", icon: ClipboardList, color: "bg-orange-100 text-orange-700" },
  linkedin_connection: { label: "LinkedIn connection", icon: UserCheck, color: "bg-blue-100 text-blue-700" },
  linkedin_dm: { label: "LinkedIn DM", icon: MessageSquare, color: "bg-blue-100 text-blue-700" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-emerald-100 text-emerald-700" },
} as const;

const TONES = ["Professional", "Friendly", "Casual", "Formal", "Concise", "Persuasive"];
const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Portuguese"];

type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

const STATUS_OPTIONS: { value: CampaignStatus; label: string; badge: string; dot: string }[] = [
  { value: "draft", label: "Draft", badge: "bg-gray-100 text-gray-700 ring-1 ring-gray-200", dot: "bg-gray-400" },
  { value: "active", label: "Active", badge: "bg-green-50 text-green-700 ring-1 ring-green-200", dot: "bg-green-500" },
  { value: "paused", label: "Paused", badge: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200", dot: "bg-yellow-500" },
  { value: "completed", label: "Completed", badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", dot: "bg-violet-500" },
  { value: "archived", label: "Archived", badge: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200", dot: "bg-zinc-400" },
];

function statusMeta(status: string | null | undefined) {
  const key = (status ?? "draft") as CampaignStatus;
  return STATUS_OPTIONS.find((o) => o.value === key) ?? STATUS_OPTIONS[0];
}

function makeStep(stepNumber: number): SequenceStep {
  return {
    id: crypto.randomUUID(),
    stepNumber,
    channel: "email",
    delayDays: stepNumber === 1 ? 0 : 3,
    subject: stepNumber === 1 ? "Quick intro" : "",
    body: "",
    condition: stepNumber === 1 ? "always" : "if_no_reply",
  };
}

export default function CampaignBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("targeting");
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function changeStatus(next: CampaignStatus) {
    if (!campaign || statusUpdating || launching || next === campaign.status) {
      setStatusMenuOpen(false);
      return;
    }
    setStatusMenuOpen(false);
    setStatusUpdating(true);
    const previous = campaign.status;
    setCampaign((prev) => (prev ? { ...prev, status: next } : prev));
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed");
      const label = STATUS_OPTIONS.find((o) => o.value === next)?.label ?? next;
      toast.success(`Campaign set to ${label}`);
    } catch {
      setCampaign((prev) => (prev ? { ...prev, status: previous } : prev));
      toast.error("Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  }

  /* targeting */
  const [availableLists, setAvailableLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  /* sequence */
  const [steps, setSteps] = useState<SequenceStep[]>([makeStep(1), makeStep(2), makeStep(3)]);
  const [expandedStep, setExpandedStep] = useState<string | null>(steps[0]?.id ?? null);
  const [savedSequenceId, setSavedSequenceId] = useState<string | null>(null);

  /* messaging */
  const [tone, setTone] = useState("Professional");
  const [language, setLanguage] = useState("English");
  const [aiDisclosure, setAiDisclosure] = useState(false);
  const [unsubscribeOption, setUnsubscribeOption] = useState<"none" | "plain_text">("none");

  /* settings */
  const [requireApproval, setRequireApproval] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(1500);
  const [maxPerCompany, setMaxPerCompany] = useState(20);
  const [skipRecentDays, setSkipRecentDays] = useState(30);

  /* analytics */
  const [analyticsTab, setAnalyticsTab] = useState<"build" | "analytics">("build");

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      const c: Campaign = json.data;
      setCampaign(c);
      setRequireApproval(c.requireApproval ?? false);
      setTone(c.tone ?? "Professional");
      setLanguage(c.language ?? "English");
      if (c.dailyLimit) setMonthlyLimit(c.dailyLimit * 30);
    } catch {
      toast.error("Campaign not found");
      router.push("/campaigns");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch("/api/lists");
      if (!res.ok) return;
      const json = await res.json();
      setAvailableLists(json.data ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchSequence = useCallback(async () => {
    try {
      const res = await fetch(`/api/sequences?campaignId=${id}`);
      if (!res.ok) return;
      const json = await res.json();
      const seqs = json.data ?? [];
      if (seqs.length > 0) {
        const seq = seqs[0];
        setSavedSequenceId(seq.id);
        if (Array.isArray(seq.steps) && seq.steps.length > 0) {
          setSteps(seq.steps.map((s: Omit<SequenceStep, "id">) => ({ ...s, id: crypto.randomUUID() })));
        }
      }
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
    fetchLists();
    fetchSequence();
  }, [fetchCampaign, fetchLists, fetchSequence]);

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requireApproval,
          tone,
          language,
          dailyLimit: Math.round(monthlyLimit / 30),
        }),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function persistSequence() {
    const stepsPayload = steps.map(({ id: _id, ...s }) => s);
    if (savedSequenceId) {
      const res = await fetch(`/api/sequences/${savedSequenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: stepsPayload }),
      });
      if (!res.ok) throw new Error("Failed to update sequence");
    } else {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: id,
          name: `${campaign?.name ?? "Campaign"} sequence`,
          steps: stepsPayload,
        }),
      });
      if (!res.ok) throw new Error("Failed to create sequence");
      const json = await res.json();
      if (json.data?.id) setSavedSequenceId(json.data.id);
    }
  }

  async function saveSequence() {
    setSaving(true);
    try {
      await persistSequence();
      toast.success("Sequence saved");
    } catch {
      toast.error("Failed to save sequence");
    } finally {
      setSaving(false);
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    try {
      try {
        await persistSequence();
      } catch {
        toast.error("Couldn't save sequence, campaign not launched");
        return;
      }
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error("Failed");
      setCampaign((prev) => (prev ? { ...prev, status: "active" } : prev));
      toast.success("Campaign launched!");
      router.push("/campaigns");
    } catch {
      toast.error("Failed to launch campaign");
    } finally {
      setLaunching(false);
    }
  }

  function addStep() {
    const newStep = makeStep(steps.length + 1);
    setSteps((prev) => [...prev, newStep]);
    setExpandedStep(newStep.id);
  }

  function removeStep(stepId: string) {
    setSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== stepId);
      return filtered.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
  }

  function updateStep(stepId: string, patch: Partial<SequenceStep>) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  }

  const estimatedMonthlyCost = monthlyLimit * 15;
  const selectedList = availableLists.find((l) => l.id === selectedListId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/campaigns" className="text-gray-500 hover:text-gray-800 transition">Campaigns</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-medium text-gray-900 truncate max-w-xs">{campaign.name}</span>
          <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
            {campaign.type ?? "Cold outbound"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Build / Analytics toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setAnalyticsTab("build")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition", analyticsTab === "build" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700")}
            >
              <GitBranch className="h-3.5 w-3.5" /> Build
            </button>
            <button
              onClick={() => setAnalyticsTab("analytics")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition", analyticsTab === "analytics" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700")}
            >
              <BarChart2 className="h-3.5 w-3.5" /> Analytics
            </button>
          </div>

          <div ref={statusMenuRef} className="relative">
            <button
              onClick={() => setStatusMenuOpen((v) => !v)}
              disabled={statusUpdating}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                statusMeta(campaign.status).badge
              )}
              aria-haspopup="menu"
              aria-expanded={statusMenuOpen}
            >
              {statusUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta(campaign.status).dot)} />
              )}
              {statusMeta(campaign.status).label}
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
            {statusMenuOpen && (
              <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {STATUS_OPTIONS.map((opt) => {
                  const selected = (campaign.status ?? "draft") === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => changeStatus(opt.value)}
                      disabled={statusUpdating}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", opt.dot)} />
                      <span className="flex-1">{opt.label}</span>
                      {selected && <Check className="h-3.5 w-3.5 text-violet-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleLaunch}
            disabled={launching || statusUpdating}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {launching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            Launch
          </button>
        </div>
      </div>

      {analyticsTab === "analytics" ? (
        <CampaignAnalytics campaign={campaign} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* ── Main content ── */}
          <div className="flex-1 overflow-y-auto">
            {/* Sub-tab nav */}
            <div className="bg-white border-b border-gray-200 px-6">
              <div className="flex gap-1">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition",
                        isActive
                          ? "border-violet-600 text-violet-700"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 max-w-3xl">
              {/* TARGETING */}
              {activeTab === "targeting" && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">People for Arya to target</h3>
                    <p className="text-xs text-gray-500 mb-4">Select a lead list that Arya will reach out to.</p>

                    {selectedList ? (
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{selectedList.name}</p>
                            {selectedList.leadsCount !== undefined && (
                              <p className="text-xs text-gray-500">{selectedList.leadsCount.toLocaleString()} prospects</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewOpen(!previewOpen)}
                            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 border border-violet-200 rounded-lg px-2.5 py-1 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </button>
                          <button onClick={() => setSelectedListId("")} className="text-gray-400 hover:text-gray-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableLists.length === 0 ? (
                          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-600">No lists yet</p>
                            <p className="text-xs text-gray-400 mt-1">Create a list from Find Leads or the Lists page.</p>
                            <Link href="/find-leads" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline">
                              Find Leads <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        ) : (
                          availableLists.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => setSelectedListId(l.id)}
                              className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:border-violet-300 hover:bg-violet-50/50 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                                  <Users className="h-3.5 w-3.5 text-violet-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">{l.name}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedListId("")}
                      className="mt-3 flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-medium"
                    >
                      <Plus className="h-4 w-4" /> Target more people
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Let Arya research and qualify each prospect</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Arya researches each prospect online and only contacts the ones who meet all your requirements.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" />
                        <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-violet-600 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setActiveTab("sequence")}
                      className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SEQUENCE */}
              {activeTab === "sequence" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Sequence steps</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Build the outreach flow. Arya will follow this sequence automatically.</p>
                    </div>
                    <button
                      onClick={saveSequence}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-medium border border-violet-200 rounded-lg px-3 py-1.5 transition"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>

                  {/* Steps */}
                  <div className="relative">
                    {steps.map((step, idx) => {
                      const meta = CHANNEL_META[step.channel];
                      const Icon = meta.icon;
                      const isExpanded = expandedStep === step.id;

                      return (
                        <div key={step.id} className="relative">
                          {idx > 0 && (
                            <div className="flex flex-col items-center my-1">
                              <div className="w-px h-4 bg-gray-200" />
                              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-2.5 py-0.5">
                                <Clock className="h-3 w-3" />
                                Wait {step.delayDays} day{step.delayDays !== 1 ? "s" : ""}
                                {step.condition === "if_no_reply" && " if no reply"}
                              </div>
                              <div className="w-px h-4 bg-gray-200" />
                            </div>
                          )}

                          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <button
                              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                              className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", meta.color)}>
                                  <Icon className="h-3.5 w-3.5" />
                                  {meta.label}
                                </span>
                                {step.subject && (
                                  <span className="text-sm text-gray-600 truncate max-w-xs">{step.subject}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {steps.length > 1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-100 p-4 space-y-3">
                                {/* Channel selector */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Channel</label>
                                  <div className="flex flex-wrap gap-2">
                                    {(Object.keys(CHANNEL_META) as Array<keyof typeof CHANNEL_META>).map((ch) => {
                                      const m = CHANNEL_META[ch];
                                      const MIcon = m.icon;
                                      return (
                                        <button
                                          key={ch}
                                          onClick={() => updateStep(step.id, { channel: ch })}
                                          className={cn(
                                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition",
                                            step.channel === ch
                                              ? "border-violet-400 bg-violet-50 text-violet-700"
                                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                                          )}
                                        >
                                          <MIcon className="h-3 w-3" />
                                          {m.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {idx > 0 && (
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Wait days</label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={60}
                                        value={step.delayDays}
                                        onChange={(e) => updateStep(step.id, { delayDays: Number(e.target.value) })}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Condition</label>
                                      <select
                                        value={step.condition}
                                        onChange={(e) => updateStep(step.id, { condition: e.target.value as SequenceStep["condition"] })}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition bg-white"
                                      >
                                        <option value="always">Always</option>
                                        <option value="if_no_reply">If no reply</option>
                                        <option value="if_opened">If opened</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {step.channel === "email" && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Subject line</label>
                                      <input
                                        type="text"
                                        value={step.subject ?? ""}
                                        onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                                        placeholder="e.g. Quick question about {{company}}"
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">Email body</label>
                                      <textarea
                                        rows={5}
                                        value={step.body ?? ""}
                                        onChange={(e) => updateStep(step.id, { body: e.target.value })}
                                        placeholder="Hi {{first_name}},&#10;&#10;I noticed {{company}} is working on...&#10;&#10;Best,&#10;{{sender_name}}"
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition font-mono resize-none"
                                      />
                                      <p className="mt-1 text-xs text-gray-400">
                                        Use tokens: {"{{first_name}}, {{company}}, {{job_title}}, {{sender_name}}"}
                                      </p>
                                    </div>
                                  </>
                                )}

                                {step.channel === "manual_task" && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Task instructions</label>
                                    <textarea
                                      rows={3}
                                      value={step.body ?? ""}
                                      onChange={(e) => updateStep(step.id, { body: e.target.value })}
                                      placeholder="e.g. Send a personalized LinkedIn message referencing their recent post..."
                                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition resize-none"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add step */}
                    <div className="flex flex-col items-center mt-2">
                      <div className="w-px h-4 bg-gray-200" />
                      <button
                        onClick={addStep}
                        className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-500 hover:border-violet-400 hover:text-violet-600 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add step
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 pt-2">
                    <button onClick={() => setActiveTab("targeting")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">Back</button>
                    <button onClick={() => { saveSequence(); setActiveTab("messaging"); }} className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition">
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* MESSAGING */}
              {activeTab === "messaging" && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Email tone & style</h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Tone</label>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map((t) => (
                          <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition",
                              tone === t ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition bg-white"
                      >
                        {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Unsubscribe option</h3>
                    {[
                      { value: "none", label: "Don't add an unsubscribe option" },
                      { value: "plain_text", label: "Add a plain-text unsubscribe line at the bottom" },
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="unsub"
                          value={opt.value}
                          checked={unsubscribeOption === opt.value}
                          onChange={() => setUnsubscribeOption(opt.value as typeof unsubscribeOption)}
                          className="mt-0.5 accent-violet-600"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">AI disclosure phrase</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Adds a line disclosing that this email was sent by an AI. Supports EU AI Act transparency requirements.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" checked={aiDisclosure} onChange={(e) => setAiDisclosure(e.target.checked)} className="peer sr-only" />
                        <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-violet-600 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3">
                    <button onClick={() => setActiveTab("sequence")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">Back</button>
                    <button onClick={() => setActiveTab("settings")} className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition">
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SETTINGS */}
              {activeTab === "settings" && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Approval</h3>
                    {[
                      { value: false, label: "Send sequence messages without approval", badge: "Recommended" },
                      { value: true, label: "Manually review each sequence message before it's sent" },
                    ].map((opt) => (
                      <label key={String(opt.value)} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="approval"
                          checked={requireApproval === opt.value}
                          onChange={() => setRequireApproval(opt.value)}
                          className="accent-violet-600"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                        {opt.badge && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{opt.badge}</span>
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Monthly volume</h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Prospects per month</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={10}
                          max={10000}
                          value={monthlyLimit}
                          onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                          className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
                        />
                        <span className="text-sm text-gray-500">prospects/month</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">People Arya should not contact</h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Also skip people who were contacted in the last</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={365}
                          value={skipRecentDays}
                          onChange={(e) => setSkipRecentDays(Number(e.target.value))}
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
                        />
                        <span className="text-sm text-gray-500">days</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Maximum people to contact per company</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={maxPerCompany}
                          onChange={(e) => setMaxPerCompany(Number(e.target.value))}
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
                        />
                        <span className="text-sm text-gray-500">people per company</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3">
                    <button onClick={() => setActiveTab("messaging")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">Back</button>
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Cost breakdown sidebar ── */}
          <div className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" /> Cost breakdown
            </h3>
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Leads/month</span>
                <span className="font-semibold text-gray-900">{monthlyLimit.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Cost per lead</span>
                <span className="font-semibold text-orange-600">~15 credits</span>
              </div>
              <div className="border-t border-orange-200 pt-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-gray-900">Estimated monthly</span>
                  <span className="text-orange-600">{estimatedMonthlyCost.toLocaleString()} credits</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-300" />
                <span>Today · {(10000).toLocaleString()} credits</span>
              </div>
              <div className="w-px h-8 ml-1 bg-gray-200" />
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-xs text-gray-500">
              <p className="font-medium text-gray-700">Sequence steps</p>
              {steps.map((s, i) => {
                const m = CHANNEL_META[s.channel];
                const MIcon = m.icon;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <MIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>Step {i + 1}: {m.label}</span>
                    {i > 0 && <span className="ml-auto text-gray-400">+{s.delayDays}d</span>}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleLaunch}
              disabled={launching}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60"
            >
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Launch campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignAnalytics({ campaign }: { campaign: Campaign }) {
  return (
    <div className="p-8">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Audience", value: campaign.totalLeads ?? 0, icon: Users, color: "text-violet-600" },
          { label: "Messages sent", value: campaign.emailsSent ?? 0, icon: Send, color: "text-blue-600" },
          { label: "Responses", value: campaign.totalReplies ?? 0, icon: MessageSquare, color: "text-green-600" },
          { label: "Meetings", value: campaign.meetingsBooked ?? 0, icon: Target, color: "text-orange-600" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-4 w-4", stat.color)} />
                <span className="text-xs font-medium text-gray-500">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-400">
        <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Campaign analytics will appear once the campaign is active and sending.</p>
      </div>
    </div>
  );
}
