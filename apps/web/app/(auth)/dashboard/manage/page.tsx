"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { BrandLogo } from "@/components/brand/BrandLogo";
import SignatureEditor from "@/components/signature/SignatureEditor";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  UserPlus,
  Send,
  MessageCircle,
  Calendar,
  ClipboardList,
  Target,
  Lock,
  Search,
  Pencil,
  Trash2,
  X,
  Plus,
  Minus,
  Check,
  Loader2,
  Info,
  UserCheck,
} from "lucide-react";

type MainTab = "overview" | "outbound" | "replies" | "guardrails";
type OutboundSubTab = "knowledge" | "defaults";
type ProofSubTab = "highlights" | "customers" | "case-studies";
type GuardrailsSubTab = "dnc" | "banned";
type DncSubTab = "emails" | "domains" | "phones" | "crm";

type ModalType =
  | null
  | "connectMailbox"
  | "setupSignature"
  | "addCoachingPoint"
  | "addProofHighlight"
  | "addProofCustomer"
  | "addProofCaseStudy"
  | "addEscalationRule"
  | "addKnowledge"
  | "addReplyCoaching"
  | "addObjectionResponse"
  | "addQualification"
  | "addDncEmail"
  | "addDncDomain"
  | "addDncPhone"
  | "addBannedPhrase"
  | { kind: "editItem"; item: AgentItem };

interface AgentItem {
  id: string;
  category: string;
  title: string;
  content: string | null;
  createdAt: string;
}

interface AnalyticsData {
  totalLeads: number;
  emailsSent: number;
  positiveReplies: number;
  meetingsBooked: number;
}

interface TaskRow {
  id: string;
  taskType: string;
  status: string;
  message: string | null;
  leadFirstName: string | null;
  leadLastName: string | null;
  leadFullName: string | null;
  leadCompanyName: string | null;
  campaignName: string | null;
  createdAt: string;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  totalLeads: number | null;
  emailsSent: number | null;
  totalReplies: number | null;
  // `/api/campaigns` doesn't currently select this column, but the audit
  // notes it exists on the row and other routes (`/api/analytics`) do
  // return it. Optional here so the ranking survives whichever payload
  // shape the campaigns endpoint returns.
  positiveReplies?: number | null;
  meetingsBooked: number | null;
}

interface ActivityItem {
  id: string;
  type: "reply" | "meeting" | "lead";
  title: string;
  subtitle?: string;
  timestamp: string;
  href?: string;
}

// Non-deletable defaults rendered at the top of the escalation list.
const DEFAULT_ESCALATION_RULES = [
  "If the lead asks to unsubscribe or opt out",
  "If Arya is unsure or missing required context",
  "If the lead expresses strong displeasure, hostility, or directly criticizes the quality of the outreach",
];

const genLocalId = () => Math.random().toString(36).slice(2, 10);

async function fetchCategory(category: string): Promise<AgentItem[]> {
  const res = await fetch(`/api/agent-config?category=${category}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as AgentItem[];
}

async function createItem(
  category: string,
  title: string,
  content?: string
): Promise<AgentItem | null> {
  const res = await fetch("/api/agent-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category,
      title,
      ...(content ? { content } : {}),
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as AgentItem;
}

async function patchItem(
  id: string,
  patch: { title?: string; content?: string | null }
): Promise<AgentItem | null> {
  const res = await fetch(`/api/agent-config/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as AgentItem;
}

async function deleteItem(id: string): Promise<boolean> {
  const res = await fetch(`/api/agent-config/${id}`, { method: "DELETE" });
  return res.ok;
}

// Category slugs, kept in sync with the backend schema.
const CAT = {
  coaching: "coaching_point",
  proofHighlight: "proof_highlight",
  proofCustomer: "proof_customer",
  proofCaseStudy: "proof_case_study",
  escalation: "escalation_rule",
  knowledge: "knowledge_item",
  replyCoaching: "reply_coaching",
  objectionResponse: "objection_response",
  qualification: "qualification_criterion",
  dncEmail: "dnc_email",
  dncDomain: "dnc_domain",
  dncPhone: "dnc_phone",
  bannedPhrase: "banned_phrase",
} as const;

export default function ManageAryaPage() {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [showRemaining, setShowRemaining] = useState(true);
  const [outboundSub, setOutboundSub] = useState<OutboundSubTab>("knowledge");
  const [proofSub, setProofSub] = useState<ProofSubTab>("highlights");
  const [guardrailsSub, setGuardrailsSub] = useState<GuardrailsSubTab>("dnc");
  const [dncSub, setDncSub] = useState<DncSubTab>("emails");

  const [isQuestsHidden, setIsQuestsHidden] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [dncAddOpen, setDncAddOpen] = useState(false);
  const dncAddRef = useRef<HTMLDivElement>(null);

  // Derived onboarding-quest state (real, from account state)
  const [questsLoading, setQuestsLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [signatureConfigured, setSignatureConfigured] = useState(false);
  const [savedSignature, setSavedSignature] = useState("");
  const [hasSignalSubscription, setHasSignalSubscription] = useState(false);

  // Overview data
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalLeads: 0,
    emailsSent: 0,
    positiveReplies: 0,
    meetingsBooked: 0,
  });
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [topCampaigns, setTopCampaigns] = useState<CampaignRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Agent-config lists (all backed by /api/agent-config)
  const [coachingPoints, setCoachingPoints] = useState<AgentItem[]>([]);
  const [proofHighlights, setProofHighlights] = useState<AgentItem[]>([]);
  const [proofCustomers, setProofCustomers] = useState<AgentItem[]>([]);
  const [proofCaseStudies, setProofCaseStudies] = useState<AgentItem[]>([]);
  const [customEscalationRules, setCustomEscalationRules] = useState<AgentItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<AgentItem[]>([]);
  const [replyCoachingItems, setReplyCoachingItems] = useState<AgentItem[]>([]);
  const [objectionResponses, setObjectionResponses] = useState<AgentItem[]>([]);
  const [qualificationItems, setQualificationItems] = useState<AgentItem[]>([]);
  const [dncEmails, setDncEmails] = useState<AgentItem[]>([]);
  const [dncDomains, setDncDomains] = useState<AgentItem[]>([]);
  const [dncPhones, setDncPhones] = useState<AgentItem[]>([]);
  const [bannedPhrases, setBannedPhrases] = useState<AgentItem[]>([]);

  // Search bars
  const [dncSearchQuery, setDncSearchQuery] = useState("");
  const [bannedSearchQuery, setBannedSearchQuery] = useState("");

  // Modal form state
  const [signatureHtml, setSignatureHtml] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [modalTitleInput, setModalTitleInput] = useState("");
  const [modalContentInput, setModalContentInput] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // ---- Refresh helpers ----

  const refreshQuests = useCallback(async () => {
    setQuestsLoading(true);
    try {
      const [integ, sig, signals] = await Promise.all([
        fetch("/api/v1/integrations/status", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ gmail: false })),
        fetch("/api/user/signature", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ signature: "" })),
        fetch("/api/signals", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ subscriptions: [] })),
      ]);
      setGmailConnected(Boolean(integ.gmail));
      const sigStr: string = typeof sig.signature === "string" ? sig.signature : "";
      setSavedSignature(sigStr);
      setSignatureConfigured(sigStr.trim().length > 0);
      const subs: Array<{ enabled?: boolean }> = signals.subscriptions ?? [];
      setHasSignalSubscription(subs.some((s) => s.enabled !== false));
    } finally {
      setQuestsLoading(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (!res.ok) throw new Error("analytics failed");
      const json = await res.json();
      const d = json.data ?? {};
      setAnalytics({
        totalLeads: d.totalLeads ?? 0,
        emailsSent: d.emailsSent ?? 0,
        positiveReplies: d.positiveReplies ?? 0,
        meetingsBooked: d.meetingsBooked ?? 0,
      });
    } catch {
      // Leave zeros — analytics is best-effort. No fake toast.
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch("/api/tasks?status=pending", { cache: "no-store" });
      const json = await res.json();
      setTasks((json.data ?? []) as TaskRow[]);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const refreshCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      const json = await res.json();
      const rows = (json.data ?? []) as CampaignRow[];
      const sorted = [...rows].sort((a, b) => {
        const scoreA = (a.positiveReplies ?? 0) + (a.meetingsBooked ?? 0) * 2 + (a.totalReplies ?? 0);
        const scoreB = (b.positiveReplies ?? 0) + (b.meetingsBooked ?? 0) * 2 + (b.totalReplies ?? 0);
        return scoreB - scoreA;
      });
      setTopCampaigns(sorted.slice(0, 5));
    } catch {
      setTopCampaigns([]);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const refreshActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch("/api/dashboard/activity", { cache: "no-store" });
      const json = await res.json();
      setActivity((json.data ?? []) as ActivityItem[]);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const refreshCategory = useCallback(
    async (
      category: string,
      setter: React.Dispatch<React.SetStateAction<AgentItem[]>>
    ) => {
      const rows = await fetchCategory(category);
      setter(rows);
    },
    []
  );

  // Positive-reply campaign score — expose the field TS thinks may be missing.
  // (`positiveReplies` isn't on the /api/campaigns response — the calling
  // agent's audit noted these fields but the current route doesn't select
  // it; fall back to totalReplies. Kept in a type-safe extension:)
  // (No-op; the sort above already handles undefined.)

  // ---- Initial load ----
  useEffect(() => {
    refreshQuests();
    refreshAnalytics();
    refreshTasks();
    refreshCampaigns();
    refreshActivity();
    // Kick off configuration list fetches in parallel — a single grouped
    // /api/agent-config call would work too, but per-category keeps the
    // wire types trivial and lets each section reload independently.
    fetchCategory(CAT.coaching).then(setCoachingPoints);
    fetchCategory(CAT.proofHighlight).then(setProofHighlights);
    fetchCategory(CAT.proofCustomer).then(setProofCustomers);
    fetchCategory(CAT.proofCaseStudy).then(setProofCaseStudies);
    fetchCategory(CAT.escalation).then(setCustomEscalationRules);
    fetchCategory(CAT.knowledge).then(setKnowledgeItems);
    fetchCategory(CAT.replyCoaching).then(setReplyCoachingItems);
    fetchCategory(CAT.objectionResponse).then(setObjectionResponses);
    fetchCategory(CAT.qualification).then(setQualificationItems);
    fetchCategory(CAT.dncEmail).then(setDncEmails);
    fetchCategory(CAT.dncDomain).then(setDncDomains);
    fetchCategory(CAT.dncPhone).then(setDncPhones);
    fetchCategory(CAT.bannedPhrase).then(setBannedPhrases);
  }, [refreshQuests, refreshAnalytics, refreshTasks, refreshCampaigns, refreshActivity]);

  // Click-outside for the DNC "+ Add" dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dncAddRef.current && !dncAddRef.current.contains(e.target as Node)) {
        setDncAddOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ESC closes modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveModal(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ---- Quest definitions (real, derived from account state) ----

  interface Quest {
    key: string;
    title: string;
    description: string;
    action: string;
    completed: boolean;
    disabled?: boolean;
    disabledReason?: string;
    next?: boolean;
  }

  const questList: Quest[] = (() => {
    const list: Quest[] = [
      {
        key: "connect_mailbox",
        title: "Connect your primary mailbox",
        description: "Enable email sending, reply forwarding, and meeting tracking",
        action: "Connect mailbox",
        completed: gmailConnected,
      },
      {
        key: "signature",
        title: "Set up email signature",
        description: "Add the signature Arya should use when sending from your mailbox",
        action: "Set up signature",
        completed: signatureConfigured,
      },
      {
        key: "signals",
        title: "Launch a signal-based campaign",
        description: "Reach prospects the moment they hit a buying-intent trigger",
        action: "Set up signals",
        completed: hasSignalSubscription,
      },
      {
        key: "secondary_mailboxes",
        title: "Add secondary mailboxes",
        description:
          "Scale daily send volume across multiple inboxes without hurting deliverability",
        action: "Coming soon",
        completed: false,
        disabled: true,
        disabledReason: "Not available yet — get in touch to enable multi-mailbox sending",
      },
      {
        key: "autopilot",
        title: "Turn on autopilot",
        description:
          "Hand Arya the wheel to run outbound end-to-end without your approval",
        action: "Coming soon",
        completed: false,
        disabled: true,
        disabledReason: "Autopilot is currently in closed beta",
      },
    ];
    // Mark the first uncompleted, non-disabled quest as "Next"
    const nextIdx = list.findIndex((q) => !q.completed && !q.disabled);
    if (nextIdx >= 0) list[nextIdx].next = true;
    return list;
  })();

  const completedCount = questList.filter((q) => q.completed).length;
  const totalQuests = questList.length;
  const progressPercent = totalQuests > 0 ? Math.round((completedCount / totalQuests) * 100) : 0;

  const handleQuestAction = useCallback(
    (quest: Quest) => {
      if (quest.disabled) {
        toast(quest.disabledReason ?? "Coming soon", { icon: "🛠️" });
        return;
      }
      switch (quest.action) {
        case "Connect mailbox":
          setActiveModal("connectMailbox");
          break;
        case "Set up signature":
          setSignatureHtml(savedSignature);
          setShowSignatureEditor(true);
          break;
        case "Set up signals":
          router.push("/signals");
          break;
      }
    },
    [router, savedSignature]
  );

  // ---- Filtered lists ----

  const filterByTitle = (rows: AgentItem[], q: string) =>
    q.trim() === ""
      ? rows
      : rows.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));

  const dncCurrentList: AgentItem[] =
    dncSub === "emails"
      ? filterByTitle(dncEmails, dncSearchQuery)
      : dncSub === "domains"
        ? filterByTitle(dncDomains, dncSearchQuery)
        : dncSub === "phones"
          ? filterByTitle(dncPhones, dncSearchQuery)
          : []; // "crm" — intentionally empty, handled as its own message below

  const filteredBannedPhrases = filterByTitle(bannedPhrases, bannedSearchQuery);

  // ---- Item CRUD helpers with real toasts ----

  const addAgentItem = useCallback(
    async (
      category: string,
      title: string,
      content: string | undefined,
      setter: React.Dispatch<React.SetStateAction<AgentItem[]>>,
      successLabel = "Added"
    ) => {
      // Optimistic-ish: show loading, then swap in real row
      const created = await createItem(category, title, content);
      if (!created) {
        toast.error("Could not save. Please try again.");
        return false;
      }
      setter((prev) => [...prev, created]);
      toast.success(successLabel);
      // For the mailbox-connect / signature quests: quests refresh happens
      // via handleModalSave callers; nothing else to poke here.
      return true;
    },
    []
  );

  const removeAgentItem = useCallback(
    async (
      item: AgentItem,
      setter: React.Dispatch<React.SetStateAction<AgentItem[]>>
    ) => {
      const ok = await deleteItem(item.id);
      if (!ok) {
        toast.error("Could not delete. Please try again.");
        return;
      }
      setter((prev) => prev.filter((r) => r.id !== item.id));
      toast.success("Deleted");
    },
    []
  );

  const updateAgentItem = useCallback(
    async (
      itemId: string,
      patch: { title?: string; content?: string | null },
      setter: React.Dispatch<React.SetStateAction<AgentItem[]>>
    ) => {
      const updated = await patchItem(itemId, patch);
      if (!updated) {
        toast.error("Could not update. Please try again.");
        return false;
      }
      setter((prev) => prev.map((r) => (r.id === itemId ? updated : r)));
      toast.success("Updated");
      return true;
    },
    []
  );

  // Map: which setter belongs to which category — used by the shared edit modal.
  const setterForCategory = useCallback(
    (category: string): React.Dispatch<React.SetStateAction<AgentItem[]>> => {
      switch (category) {
        case CAT.coaching:
          return setCoachingPoints;
        case CAT.proofHighlight:
          return setProofHighlights;
        case CAT.proofCustomer:
          return setProofCustomers;
        case CAT.proofCaseStudy:
          return setProofCaseStudies;
        case CAT.escalation:
          return setCustomEscalationRules;
        case CAT.knowledge:
          return setKnowledgeItems;
        case CAT.replyCoaching:
          return setReplyCoachingItems;
        case CAT.objectionResponse:
          return setObjectionResponses;
        case CAT.qualification:
          return setQualificationItems;
        case CAT.dncEmail:
          return setDncEmails;
        case CAT.dncDomain:
          return setDncDomains;
        case CAT.dncPhone:
          return setDncPhones;
        case CAT.bannedPhrase:
          return setBannedPhrases;
        default:
          return setKnowledgeItems;
      }
    },
    []
  );

  // Which categories support a `content` body (for the edit modal)
  const categoryHasContent = (cat: string): boolean =>
    cat === CAT.proofCustomer ||
    cat === CAT.proofCaseStudy ||
    cat === CAT.knowledge ||
    cat === CAT.replyCoaching ||
    cat === CAT.objectionResponse ||
    cat === CAT.qualification;

  const closeModal = () => {
    setActiveModal(null);
    setSignatureHtml("");
    setModalTitleInput("");
    setModalContentInput("");
    setModalSaving(false);
  };

  const openAdd = (kind: Exclude<ModalType, null | { kind: "editItem"; item: AgentItem }>) => {
    setModalTitleInput("");
    setModalContentInput("");
    setActiveModal(kind);
  };

  const openEdit = (item: AgentItem) => {
    setModalTitleInput(item.title);
    setModalContentInput(item.content ?? "");
    setActiveModal({ kind: "editItem", item });
  };

  // ---- Modal renderer ----

  const modalWrapper = (
    title: string,
    content: React.ReactNode,
    footer: React.ReactNode
  ) => (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-4">{content}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">{footer}</div>
      </div>
    </div>
  );

  const cancelBtn = (
    <button
      onClick={closeModal}
      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Cancel
    </button>
  );

  const saveBtn = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled || modalSaving}
      className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      {modalSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </button>
  );

  const runAdd = async (
    category: string,
    setter: React.Dispatch<React.SetStateAction<AgentItem[]>>,
    includeContent: boolean,
    successLabel: string
  ) => {
    const t = modalTitleInput.trim();
    if (!t) return;
    setModalSaving(true);
    const ok = await addAgentItem(
      category,
      t,
      includeContent ? (modalContentInput.trim() || undefined) : undefined,
      setter,
      successLabel
    );
    setModalSaving(false);
    if (ok) closeModal();
  };

  const runEdit = async (item: AgentItem) => {
    const t = modalTitleInput.trim();
    if (!t) return;
    const patch: { title?: string; content?: string | null } = { title: t };
    if (categoryHasContent(item.category)) {
      const c = modalContentInput.trim();
      patch.content = c === "" ? null : c;
    }
    setModalSaving(true);
    const ok = await updateAgentItem(item.id, patch, setterForCategory(item.category));
    setModalSaving(false);
    if (ok) closeModal();
  };

  const renderModal = () => {
    if (activeModal === null) return null;

    if (typeof activeModal === "object" && activeModal.kind === "editItem") {
      const item = activeModal.item;
      const hasContent = categoryHasContent(item.category);
      const isSimple = !hasContent; // e.g. banned phrase, DNC row, escalation rule, coaching, highlight
      const titleLabel = isSimple ? "Value" : "Title";
      return modalWrapper(
        "Edit item",
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{titleLabel}</label>
            <input
              type="text"
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autoFocus
            />
          </div>
          {hasContent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={modalContentInput}
                onChange={(e) => setModalContentInput(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          )}
        </div>,
        <>
          {cancelBtn}
          {saveBtn("Save", () => runEdit(item), modalTitleInput.trim() === "")}
        </>
      );
    }

    switch (activeModal) {
      case "connectMailbox":
        return modalWrapper(
          "Connect your primary mailbox",
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect Gmail so Arya can send from your inbox and forward replies back to you. You&apos;ll need a Gmail App Password.
            </p>
            <button
              onClick={() => {
                window.location.href = "/settings/integrations";
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:border-[#6C47FF] hover:bg-violet-50/40 transition-colors flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 shrink-0">
                <BrandLogo brand="gmail" className="h-7 w-7" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-gray-900">Gmail</span>
                <span className="block text-xs text-gray-500">Connect with App Password</span>
              </span>
            </button>
          </div>,
          <>{cancelBtn}</>
        );

      case "setupSignature":
        return modalWrapper(
          "Set up email signature",
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Build your signature with structured fields and a live preview.
            </p>
            <button
              onClick={() => {
                closeModal();
                setShowSignatureEditor(true);
              }}
              className="text-sm font-medium text-[#6C47FF] hover:text-[#5A38E0]"
            >
              Use the full signature editor →
            </button>
          </div>,
          <>{cancelBtn}</>
        );

      case "addCoachingPoint":
        return modalWrapper(
          "Add coaching point",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coaching instruction</label>
            <textarea
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              placeholder="Enter coaching instruction for Arya..."
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.coaching, setCoachingPoints, false, "Coaching point added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addProofHighlight":
        return modalWrapper(
          "Add proof highlight",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
            <input
              type="text"
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              placeholder="e.g. 3x more meetings"
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.proofHighlight, setProofHighlights, false, "Highlight added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addProofCustomer":
        return modalWrapper(
          "Add customer",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer name / logo caption</label>
              <input
                type="text"
                value={modalTitleInput}
                onChange={(e) => setModalTitleInput(e.target.value)}
                placeholder="e.g. Acme Corp"
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={modalContentInput}
                onChange={(e) => setModalContentInput(e.target.value)}
                placeholder="Segment, use case, or a short quote Arya can reference..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.proofCustomer, setProofCustomers, true, "Customer added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addProofCaseStudy":
        return modalWrapper(
          "Add case study",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={modalTitleInput}
                onChange={(e) => setModalTitleInput(e.target.value)}
                placeholder="e.g. How Acme cut sales cycle by 40%"
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea
                value={modalContentInput}
                onChange={(e) => setModalContentInput(e.target.value)}
                placeholder="The problem, what changed, and the outcome Arya can cite..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.proofCaseStudy, setProofCaseStudies, true, "Case study added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addEscalationRule":
        return modalWrapper(
          "Add escalation rule",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule</label>
            <textarea
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              placeholder="Describe when Arya should escalate..."
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.escalation, setCustomEscalationRules, false, "Rule added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addKnowledge":
        return modalWrapper(
          "Add knowledge",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={modalTitleInput}
                onChange={(e) => setModalTitleInput(e.target.value)}
                placeholder="e.g. Product pricing FAQ"
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={modalContentInput}
                onChange={(e) => setModalContentInput(e.target.value)}
                placeholder="Enter knowledge content..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.knowledge, setKnowledgeItems, true, "Knowledge item added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addReplyCoaching":
        return modalWrapper(
          "Add coaching item",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={modalTitleInput}
                onChange={(e) => setModalTitleInput(e.target.value)}
                placeholder="e.g. Tone of voice"
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={modalContentInput}
                onChange={(e) => setModalContentInput(e.target.value)}
                placeholder="Enter coaching content..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.replyCoaching, setReplyCoachingItems, true, "Coaching item added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addObjectionResponse":
        return modalWrapper(
          "Add objection response",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objection (what the prospect says)
              </label>
              <input
                type="text"
                value={modalTitleInput}
                onChange={(e) => setModalTitleInput(e.target.value)}
                placeholder={"e.g. We already use a competitor"}
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recommended response
              </label>
              <textarea
                value={modalContentInput}
                onChange={(e) => setModalContentInput(e.target.value)}
                placeholder="How Arya should respond when this objection comes up..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () =>
                runAdd(
                  CAT.objectionResponse,
                  setObjectionResponses,
                  true,
                  "Objection response added"
                ),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addQualification":
        return modalWrapper(
          "Add qualification criterion",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={modalTitleInput}
                onChange={(e) => setModalTitleInput(e.target.value)}
                placeholder="e.g. Minimum company size"
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={modalContentInput}
                onChange={(e) => setModalContentInput(e.target.value)}
                placeholder="Enter criterion details..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.qualification, setQualificationItems, true, "Criterion added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addDncEmail":
        return modalWrapper(
          "Add email address",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              placeholder="user@example.com"
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.dncEmail, setDncEmails, false, "Email added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addDncDomain":
        return modalWrapper(
          "Add company domain",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company domain</label>
            <input
              type="text"
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              placeholder="example.com"
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.dncDomain, setDncDomains, false, "Domain added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addDncPhone":
        return modalWrapper(
          "Add phone number",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="tel"
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              placeholder="+91 98765 43210"
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.dncPhone, setDncPhones, false, "Phone added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      case "addBannedPhrase":
        return modalWrapper(
          "Add banned phrase",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phrase</label>
            <textarea
              value={modalTitleInput}
              onChange={(e) => setModalTitleInput(e.target.value)}
              placeholder="Enter a phrase Arya should never use..."
              rows={3}
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>,
          <>
            {cancelBtn}
            {saveBtn(
              "Save",
              () => runAdd(CAT.bannedPhrase, setBannedPhrases, false, "Phrase added"),
              modalTitleInput.trim() === ""
            )}
          </>
        );

      default:
        return null;
    }
  };

  // ---- Shared list-item renderer with real edit + delete ----

  const renderListItems = (
    items: AgentItem[],
    setter: React.Dispatch<React.SetStateAction<AgentItem[]>>
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2 mt-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between rounded-lg border border-gray-100 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <span className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {item.title}
              </span>
              {item.content && (
                <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">
                  {item.content}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <button
                onClick={() => openEdit(item)}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeAgentItem(item, setter)}
                className="p-1 text-red-400 hover:text-red-600"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Compact renderer for value-only lists (DNC, banned phrases)
  const renderSimpleList = (
    items: AgentItem[],
    setter: React.Dispatch<React.SetStateAction<AgentItem[]>>
  ) => (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
        >
          <span className="text-sm text-gray-700 break-all">{item.title}</span>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <button
              onClick={() => openEdit(item)}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => removeAgentItem(item, setter)}
              className="p-1 text-red-400 hover:text-red-600"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // ---- Overview helpers ----

  const statTiles = [
    { icon: UserPlus, label: "New leads enrolled", value: analytics.totalLeads },
    { icon: Send, label: "Messages sent", value: analytics.emailsSent },
    { icon: MessageCircle, label: "Positive responses", value: analytics.positiveReplies },
    { icon: Calendar, label: "Meetings booked", value: analytics.meetingsBooked },
  ];

  const taskLeadName = (t: TaskRow) =>
    t.leadFullName ||
    [t.leadFirstName, t.leadLastName].filter(Boolean).join(" ") ||
    t.leadCompanyName ||
    "Lead";

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const activityIcon = (t: ActivityItem["type"]) => {
    switch (t) {
      case "reply":
        return <MessageCircle className="h-4 w-4 text-violet-500" />;
      case "meeting":
        return <Calendar className="h-4 w-4 text-emerald-500" />;
      case "lead":
        return <UserCheck className="h-4 w-4 text-sky-500" />;
    }
  };

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "outbound", label: "Outbound sequences" },
    { key: "replies", label: "Autonomous replies" },
    { key: "guardrails", label: "Guardrails" },
  ];

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Arya</h1>
        <Link
          href="/campaigns"
          className="rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#5A38E0] active:scale-[0.98] transition-all duration-150"
        >
          + New campaign
        </Link>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-violet-600 text-violet-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================ OVERVIEW ============================ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Onboarding Quests */}
          {!isQuestsHidden && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-gray-900">Onboarding quests</h2>
                  <span className="text-sm text-gray-500">
                    {questsLoading ? "Loading…" : `${completedCount}/${totalQuests} complete`}
                  </span>
                </div>
                <button
                  onClick={() => setIsQuestsHidden(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full mb-5">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <button
                onClick={() => setShowRemaining(!showRemaining)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4"
              >
                Remaining
                {showRemaining ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showRemaining && (
                <div className="space-y-4">
                  {questList.map((quest) => (
                    <div key={quest.key} className="flex items-center gap-4 py-2">
                      {/* Real completion indicator (not clickable) */}
                      <div
                        className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          quest.completed
                            ? "border-violet-600 bg-violet-600"
                            : "border-gray-300"
                        }`}
                        title={quest.completed ? "Completed" : "Not yet complete"}
                      >
                        {quest.completed && <Check className="h-3 w-3 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-medium text-sm ${
                              quest.completed ? "text-gray-400 line-through" : "text-gray-900"
                            }`}
                          >
                            {quest.title}
                          </span>
                          {quest.next && (
                            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              Next
                            </span>
                          )}
                          {quest.disabled && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                              Coming soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{quest.description}</p>
                      </div>

                      <button
                        onClick={() => handleQuestAction(quest)}
                        disabled={quest.disabled || quest.completed}
                        className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {quest.completed ? "Done" : quest.action}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isQuestsHidden && (
            <button
              onClick={() => setIsQuestsHidden(false)}
              className="w-full rounded-xl border border-dashed border-gray-300 bg-white py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
            >
              Show onboarding quests
            </button>
          )}

          {/* Arya's Recent Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <h2 className="font-bold text-gray-900">Arya&apos;s recent progress</h2>
              </div>
              <Link href="/analytics" className="text-sm font-medium text-violet-600 hover:text-violet-700">
                View all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statTiles.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
                >
                  <stat.icon className="h-5 w-5 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  {analyticsLoading ? (
                    <div className="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stat.value.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Arya needs input on */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900">Tasks Arya needs input on</h2>
              {tasks.length > 0 && (
                <Link
                  href="/tasks"
                  className="text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  View all
                </Link>
              )}
            </div>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-900">No tasks right now</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  When Arya needs your input on messages or approvals, they will show up here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.slice(0, 5).map((t) => (
                  <Link
                    href="/tasks"
                    key={t.id}
                    className="flex items-start gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                  >
                    <ClipboardList className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {taskLeadName(t)}
                        {t.campaignName ? (
                          <span className="text-gray-500 font-normal"> · {t.campaignName}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {t.taskType.replaceAll("_", " ")}
                        {t.message ? ` — ${t.message}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDateShort(t.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top Performing Campaigns */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900">Arya&apos;s top performing campaigns</h2>
              {topCampaigns.length > 0 && (
                <Link
                  href="/campaigns"
                  className="text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  View all
                </Link>
              )}
            </div>
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : topCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Target className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-900">No campaigns yet</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Top performing campaigns will appear here once you have activity.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {topCampaigns.map((c) => (
                  <Link
                    href={`/campaigns/${c.id}`}
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(c.emailsSent ?? 0).toLocaleString()} sent · {(c.totalReplies ?? 0).toLocaleString()} replies · {(c.meetingsBooked ?? 0).toLocaleString()} meetings
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 ml-3">{c.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Latest Activity */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-6">Arya&apos;s latest activity</h2>
            {activityLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-900">No activity yet</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Arya&apos;s recent emails, responses, and new leads will show up here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activity.map((a) => {
                  const inner = (
                    <div className="flex items-start gap-3 py-3">
                      <div className="mt-0.5 shrink-0">{activityIcon(a.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 truncate">{a.title}</p>
                        {a.subtitle && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{a.subtitle}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatDateShort(a.timestamp)}
                      </span>
                    </div>
                  );
                  return a.href ? (
                    <Link
                      href={a.href}
                      key={a.id}
                      className="block hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={a.id}>{inner}</div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================ OUTBOUND ============================ */}
      {activeTab === "outbound" && (
        <div className="space-y-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-6">
              {(
                [
                  { key: "knowledge", label: "Knowledge" },
                  { key: "defaults", label: "Default settings" },
                ] as { key: OutboundSubTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setOutboundSub(tab.key)}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    outboundSub === tab.key
                      ? "border-b-2 border-violet-600 text-violet-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {outboundSub === "knowledge" && (
            <div className="space-y-6">
              {/* Shared campaign coaching */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="font-bold text-gray-900">Shared campaign coaching</h2>
                  <button
                    onClick={() => openAdd("addCoachingPoint")}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    + Add coaching point
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Coaching that applies to every campaign, unless you turn it off for one.
                </p>

                {coachingPoints.length === 0 ? (
                  <>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="font-medium text-gray-900">No coaching points yet</p>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => openAdd("addCoachingPoint")}
                        className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
                      >
                        + Add your first coaching point
                      </button>
                    </div>
                  </>
                ) : (
                  renderListItems(coachingPoints, setCoachingPoints)
                )}
              </div>

              {/* Proof & results */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="font-bold text-gray-900">Shared proof &amp; results</h2>
                  <button
                    onClick={() =>
                      openAdd(
                        proofSub === "highlights"
                          ? "addProofHighlight"
                          : proofSub === "customers"
                            ? "addProofCustomer"
                            : "addProofCaseStudy"
                      )
                    }
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    +{" "}
                    {proofSub === "highlights"
                      ? "Add highlight"
                      : proofSub === "customers"
                        ? "Add customer"
                        : "Add case study"}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">Wins, customers, and case studies Arya can mention.</p>

                <div className="border-b border-gray-200 mb-4">
                  <div className="flex gap-6">
                    {(
                      [
                        { key: "highlights", label: "Highlights" },
                        { key: "customers", label: "Customers" },
                        { key: "case-studies", label: "Case studies" },
                      ] as { key: ProofSubTab; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setProofSub(tab.key)}
                        className={`pb-3 text-sm font-medium transition-colors ${
                          proofSub === tab.key
                            ? "border-b-2 border-violet-600 text-violet-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {proofSub === "highlights" && (
                  <>
                    {proofHighlights.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-sm text-gray-500">
                          No highlights yet. Add wins Arya can drop into outreach — e.g.
                          &quot;3x more meetings&quot;.
                        </p>
                      </div>
                    ) : (
                      renderListItems(proofHighlights, setProofHighlights)
                    )}
                  </>
                )}

                {proofSub === "customers" && (
                  <>
                    {proofCustomers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-sm text-gray-500">No customers added yet.</p>
                      </div>
                    ) : (
                      renderListItems(proofCustomers, setProofCustomers)
                    )}
                  </>
                )}

                {proofSub === "case-studies" && (
                  <>
                    {proofCaseStudies.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-sm text-gray-500">No case studies added yet.</p>
                      </div>
                    ) : (
                      renderListItems(proofCaseStudies, setProofCaseStudies)
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {outboundSub === "defaults" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Info className="h-8 w-8 text-gray-300 mb-3" />
                <p className="font-medium text-gray-900">Default settings</p>
                <p className="text-sm text-gray-500 mt-1 max-w-md">
                  Per-campaign settings (tone, send limits, channels) live inside each
                  campaign for now. Account-wide defaults can be adjusted from{" "}
                  <Link href="/settings" className="text-violet-600 hover:text-violet-700">
                    Settings
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================= AUTONOMOUS REPLIES ========================= */}
      {activeTab === "replies" && (
        <div className="space-y-6">
          {/* Escalation rules */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">
              When should Arya escalate the conversation to a human?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Set the rules to escalate the lead to the sender for review.
            </p>
            <div className="space-y-3">
              {DEFAULT_ESCALATION_RULES.map((rule) => (
                <div
                  key={rule}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <span className="text-sm text-gray-700">{rule}</span>
                  <span title="Default rule" aria-label="Default rule">
                    <Lock className="h-4 w-4 text-gray-400 shrink-0 ml-4" />
                  </span>
                </div>
              ))}
              {customEscalationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <span className="text-sm text-gray-700 break-words">{rule.title}</span>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => openEdit(rule)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeAgentItem(rule, setCustomEscalationRules)}
                      className="p-1 text-red-400 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => openAdd("addEscalationRule")}
              className="mt-4 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              + Add escalation rule
            </button>
          </div>

          {/* Knowledge base */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Knowledge base</h2>
            <p className="text-sm text-gray-500 mb-5">Give Arya more context about your campaigns.</p>
            <button
              onClick={() => openAdd("addKnowledge")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add knowledge
            </button>
            {renderListItems(knowledgeItems, setKnowledgeItems)}
          </div>

          {/* Reply coaching */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Reply coaching</h2>
            <p className="text-sm text-gray-500 mb-5">
              Guide Arya on what content to write to prospects when replying.
            </p>
            <button
              onClick={() => openAdd("addReplyCoaching")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add coaching item
            </button>
            {renderListItems(replyCoachingItems, setReplyCoachingItems)}
          </div>

          {/* Objection responses */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Objection responses</h2>
            <p className="text-sm text-gray-500 mb-5">
              Teach Arya how to handle common prospect objections. The title is
              the objection quote; the content is how Arya should respond.
            </p>
            <button
              onClick={() => openAdd("addObjectionResponse")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add objection response
            </button>
            {renderListItems(objectionResponses, setObjectionResponses)}
          </div>

          {/* Qualification criteria */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Qualification criteria</h2>
            <p className="text-sm text-gray-500 mb-5">
              Arya will first do web research to confirm if the lead meets qualification criteria.
            </p>
            <button
              onClick={() => openAdd("addQualification")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add qualification criterion
            </button>
            {renderListItems(qualificationItems, setQualificationItems)}
          </div>
        </div>
      )}

      {/* ============================ GUARDRAILS ============================ */}
      {activeTab === "guardrails" && (
        <div className="space-y-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-6">
              {(
                [
                  { key: "dnc", label: "Do not contact" },
                  { key: "banned", label: "Banned phrases" },
                ] as { key: GuardrailsSubTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setGuardrailsSub(tab.key)}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    guardrailsSub === tab.key
                      ? "border-b-2 border-violet-600 text-violet-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {guardrailsSub === "dnc" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm text-gray-500">Arya will never contact anyone on these lists.</p>
                {dncSub !== "crm" && (
                  <div className="relative" ref={dncAddRef}>
                    <button
                      onClick={() => setDncAddOpen(!dncAddOpen)}
                      className="rounded-lg bg-[#6C47FF] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
                    >
                      + Add
                    </button>
                    {dncAddOpen && (
                      <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                        <button
                          onClick={() => {
                            setDncAddOpen(false);
                            openAdd("addDncEmail");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Add email address
                        </button>
                        <button
                          onClick={() => {
                            setDncAddOpen(false);
                            openAdd("addDncDomain");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Add company domain
                        </button>
                        <button
                          onClick={() => {
                            setDncAddOpen(false);
                            openAdd("addDncPhone");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Add phone number
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-b border-gray-200 mb-4">
                <div className="flex gap-6">
                  {(
                    [
                      { key: "emails", label: `Email addresses (${dncEmails.length})` },
                      { key: "domains", label: `Company domains (${dncDomains.length})` },
                      { key: "phones", label: `Phone numbers (${dncPhones.length})` },
                      { key: "crm", label: "CRM" },
                    ] as { key: DncSubTab; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setDncSub(tab.key);
                        setDncSearchQuery("");
                      }}
                      className={`pb-3 text-sm font-medium transition-colors ${
                        dncSub === tab.key
                          ? "border-b-2 border-violet-600 text-violet-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {dncSub === "crm" ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Info className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-900">CRM sync not available yet</p>
                  <p className="text-sm text-gray-500 mt-1 max-w-md">
                    Connect a CRM integration to sync do-not-contact entries automatically. This is on
                    the roadmap — for now, add DNC entries directly to the Email, Domain, or Phone tabs.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={dncSearchQuery}
                      onChange={(e) => setDncSearchQuery(e.target.value)}
                      placeholder={`Search ${
                        dncSub === "emails"
                          ? "email addresses"
                          : dncSub === "domains"
                            ? "company domains"
                            : "phone numbers"
                      }...`}
                      className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {dncCurrentList.length > 0 ? (
                    renderSimpleList(
                      dncCurrentList,
                      dncSub === "emails"
                        ? setDncEmails
                        : dncSub === "domains"
                          ? setDncDomains
                          : setDncPhones
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Search className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="font-medium text-gray-900">
                        No{" "}
                        {dncSub === "emails"
                          ? "email addresses"
                          : dncSub === "domains"
                            ? "company domains"
                            : "phone numbers"}{" "}
                        in DNC list
                      </p>
                      <p className="text-sm text-gray-500 mt-1 max-w-sm">
                        Add{" "}
                        {dncSub === "emails"
                          ? "email addresses"
                          : dncSub === "domains"
                            ? "company domains"
                            : "phone numbers"}{" "}
                        to prevent contacting them.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {guardrailsSub === "banned" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm text-gray-500">Arya will never use these phrases in outreach.</p>
                <button
                  onClick={() => openAdd("addBannedPhrase")}
                  className="rounded-lg bg-[#6C47FF] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
                >
                  + Add phrase
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={bannedSearchQuery}
                  onChange={(e) => setBannedSearchQuery(e.target.value)}
                  placeholder="Search banned phrases..."
                  className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {filteredBannedPhrases.length > 0 ? (
                renderSimpleList(filteredBannedPhrases, setBannedPhrases)
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-900">No banned phrases yet</p>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    Add phrases that Arya should never use in outreach messages.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {renderModal()}
      {showSignatureEditor && (
        <SignatureEditor
          onClose={() => setShowSignatureEditor(false)}
          onSaved={(s) => {
            setSavedSignature(s);
            setSignatureHtml(s);
            setSignatureConfigured(s.trim().length > 0);
          }}
        />
      )}
    </div>
  );
}
