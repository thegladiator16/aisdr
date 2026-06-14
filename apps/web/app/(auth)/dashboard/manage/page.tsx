"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Coins,
  X,
  Plus,
  Minus,
  Check,
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
  | "buyMailboxes"
  | "enableAutopilot"
  | "addCoachingPoint"
  | "addProof"
  | "addEscalationRule"
  | "addKnowledge"
  | "addCoachingItem"
  | "addQualification"
  | "manageLists"
  | "addDncEmail"
  | "addDncDomain"
  | "addDncPhone"
  | "addBannedPhrase";

interface ListItem {
  id: string;
  title: string;
  content?: string;
}

export default function ManageAryaPage() {
  const router = useRouter();

  // -- Tab state --
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [showRemaining, setShowRemaining] = useState(true);
  const [outboundSub, setOutboundSub] = useState<OutboundSubTab>("knowledge");
  const [proofSub, setProofSub] = useState<ProofSubTab>("highlights");
  const [guardrailsSub, setGuardrailsSub] = useState<GuardrailsSubTab>("dnc");
  const [dncSub, setDncSub] = useState<DncSubTab>("emails");

  // -- 1. Hide quests card --
  const [isQuestsHidden, setIsQuestsHidden] = useState(false);

  // -- 2. Load more quests --
  const [showMore, setShowMore] = useState(false);

  // -- 3. Quest checkboxes --
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());

  // -- 4. Modals --
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // -- 5. Time period dropdown --
  const [timePeriod, setTimePeriod] = useState("Last month");
  const [timePeriodOpen, setTimePeriodOpen] = useState(false);
  const timePeriodRef = useRef<HTMLDivElement>(null);

  // -- 6. Senders dropdown --
  const [sender, setSender] = useState("All senders");
  const [senderOpen, setSenderOpen] = useState(false);
  const senderRef = useRef<HTMLDivElement>(null);

  // -- 8. Coaching points --
  const [coachingPoints, setCoachingPoints] = useState<ListItem[]>([]);
  const [coachingInput, setCoachingInput] = useState("");

  // -- 9 & 10. Highlights --
  const [highlightsList, setHighlightsList] = useState<string[]>([
    "3x more meetings",
    "80% cost savings vs human SDR",
    "Setup in 30 minutes",
    "WhatsApp + Email outreach",
  ]);
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);
  const [editingHighlightValue, setEditingHighlightValue] = useState("");

  // -- 11. Proof items --
  const [proofItems, setProofItems] = useState<ListItem[]>([]);
  const [proofTitleInput, setProofTitleInput] = useState("");
  const [proofDescInput, setProofDescInput] = useState("");

  // -- 12. Escalation rules --
  const defaultEscalationRules = [
    "If the lead asks to unsubscribe or opt out",
    "If Arya is unsure or missing required context",
    "If the lead expresses strong displeasure, hostility, or directly criticizes the quality of the outreach",
  ];
  const [customEscalationRules, setCustomEscalationRules] = useState<string[]>([]);
  const [escalationInput, setEscalationInput] = useState("");

  // -- 13. Past conversations toggle --
  const [pastConversationsEnabled, setPastConversationsEnabled] = useState(false);

  // -- 14. Knowledge, Coaching items, Qualification --
  const [knowledgeItems, setKnowledgeItems] = useState<ListItem[]>([]);
  const [knowledgeTitleInput, setKnowledgeTitleInput] = useState("");
  const [knowledgeContentInput, setKnowledgeContentInput] = useState("");

  const [replyCoachingItems, setReplyCoachingItems] = useState<ListItem[]>([]);
  const [replyCoachingTitleInput, setReplyCoachingTitleInput] = useState("");
  const [replyCoachingContentInput, setReplyCoachingContentInput] = useState("");

  const [qualificationItems, setQualificationItems] = useState<ListItem[]>([]);
  const [qualificationTitleInput, setQualificationTitleInput] = useState("");
  const [qualificationContentInput, setQualificationContentInput] = useState("");

  // -- 16. DNC Add dropdown --
  const [dncAddOpen, setDncAddOpen] = useState(false);
  const dncAddRef = useRef<HTMLDivElement>(null);

  // -- DNC lists --
  const [dncEmails, setDncEmails] = useState<string[]>([]);
  const [dncDomains, setDncDomains] = useState<string[]>([]);
  const [dncPhones, setDncPhones] = useState<string[]>([]);
  const [dncInput, setDncInput] = useState("");

  // -- 17. Banned phrases --
  const [bannedPhrases, setBannedPhrases] = useState<string[]>([]);
  const [bannedPhraseInput, setBannedPhraseInput] = useState("");

  // -- 18. Search bars --
  const [dncSearchQuery, setDncSearchQuery] = useState("");
  const [bannedSearchQuery, setBannedSearchQuery] = useState("");

  // -- Modal form state --
  const [mailboxEmail, setMailboxEmail] = useState("");
  const [signatureHtml, setSignatureHtml] = useState("");
  const [mailboxQuantity, setMailboxQuantity] = useState(1);

  // -- Quests data --
  const baseQuests = [
    {
      title: "Connect your primary mailbox",
      next: true,
      description: "Enable email sending, reply forwarding, and meeting tracking",
      credits: 200,
      action: "Connect mailbox",
    },
    {
      title: "Set up email signature",
      next: false,
      description: "Add the signature Arya should use when sending from your mailbox",
      credits: 200,
      action: "Set up signature",
    },
    {
      title: "Launch a signal-based campaign",
      next: false,
      description: "Reach prospects the moment they hit a buying-intent trigger",
      credits: 200,
      action: "Set up signals",
    },
    {
      title: "Add secondary mailboxes",
      next: false,
      description: "Scale daily send volume across multiple inboxes without hurting deliverability",
      credits: 1000,
      action: "Buy mailboxes",
    },
    {
      title: "Turn on autopilot",
      next: false,
      description: "Hand Arya the wheel to run outbound end-to-end without your approval",
      credits: 400,
      action: "Enable autopilot",
    },
  ];

  const extraQuests = [
    {
      title: "Set up A/B testing",
      next: false,
      description: "Test different email variations to optimize open and reply rates",
      credits: 300,
      action: "Set up signals",
    },
    {
      title: "Configure lead scoring",
      next: false,
      description: "Prioritize outreach based on lead engagement and fit signals",
      credits: 250,
      action: "Set up signals",
    },
    {
      title: "Set up CRM integration",
      next: false,
      description: "Sync leads, activities, and deals with your CRM automatically",
      credits: 500,
      action: "Set up signals",
    },
    {
      title: "Enable WhatsApp outreach",
      next: false,
      description: "Reach prospects on WhatsApp for higher engagement rates",
      credits: 400,
      action: "Set up signals",
    },
    {
      title: "Customize email templates",
      next: false,
      description: "Create branded email templates Arya can use across campaigns",
      credits: 200,
      action: "Set up signals",
    },
    {
      title: "Set up meeting booking",
      next: false,
      description: "Connect your calendar so Arya can book meetings directly",
      credits: 300,
      action: "Set up signals",
    },
    {
      title: "Configure follow-up rules",
      next: false,
      description: "Set how and when Arya should follow up with unresponsive leads",
      credits: 200,
      action: "Set up signals",
    },
    {
      title: "Enable LinkedIn outreach",
      next: false,
      description: "Connect LinkedIn to add multi-channel touchpoints to sequences",
      credits: 400,
      action: "Set up signals",
    },
  ];

  const allQuests = showMore ? [...baseQuests, ...extraQuests] : baseQuests;
  const totalQuests = baseQuests.length + extraQuests.length;

  // -- Main tabs --
  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "outbound", label: "Outbound sequences" },
    { key: "replies", label: "Autonomous replies" },
    { key: "guardrails", label: "Guardrails" },
  ];

  // -- Time period options --
  const timePeriodOptions = ["Last 7 days", "Last 30 days", "Last month", "Last 3 months", "Last year"];
  const senderOptions = ["All senders", "Shashank Kumar"];

  // -- Click outside handler for dropdowns --
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (timePeriodRef.current && !timePeriodRef.current.contains(e.target as Node)) {
        setTimePeriodOpen(false);
      }
      if (senderRef.current && !senderRef.current.contains(e.target as Node)) {
        setSenderOpen(false);
      }
      if (dncAddRef.current && !dncAddRef.current.contains(e.target as Node)) {
        setDncAddOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -- ESC key handler for modals --
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveModal(null);
        setEditingHighlightIndex(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // -- Quest checkbox toggle --
  const toggleQuest = useCallback((title: string) => {
    setCompletedQuests((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }, []);

  // -- Quest action handler --
  const handleQuestAction = useCallback(
    (action: string) => {
      switch (action) {
        case "Connect mailbox":
          setActiveModal("connectMailbox");
          break;
        case "Set up signature":
          setActiveModal("setupSignature");
          break;
        case "Set up signals":
          router.push("/signals");
          break;
        case "Buy mailboxes":
          setMailboxQuantity(1);
          setActiveModal("buyMailboxes");
          break;
        case "Enable autopilot":
          setActiveModal("enableAutopilot");
          break;
      }
    },
    [router]
  );

  // -- Progress calculation --
  const progressPercent = totalQuests > 0 ? Math.round((completedQuests.size / totalQuests) * 100) : 0;

  // -- Generate unique ID --
  const genId = () => Math.random().toString(36).slice(2, 10);

  // -- DNC filtered lists --
  const filteredDncEmails = dncEmails.filter((e) => e.toLowerCase().includes(dncSearchQuery.toLowerCase()));
  const filteredDncDomains = dncDomains.filter((d) => d.toLowerCase().includes(dncSearchQuery.toLowerCase()));
  const filteredDncPhones = dncPhones.filter((p) => p.toLowerCase().includes(dncSearchQuery.toLowerCase()));
  const filteredBannedPhrases = bannedPhrases.filter((p) => p.toLowerCase().includes(bannedSearchQuery.toLowerCase()));

  // -- Get current DNC list by sub-tab --
  const getCurrentDncList = () => {
    switch (dncSub) {
      case "emails":
        return filteredDncEmails;
      case "domains":
        return filteredDncDomains;
      case "phones":
        return filteredDncPhones;
      default:
        return [];
    }
  };

  const removeDncItem = (item: string) => {
    switch (dncSub) {
      case "emails":
        setDncEmails((prev) => prev.filter((e) => e !== item));
        break;
      case "domains":
        setDncDomains((prev) => prev.filter((d) => d !== item));
        break;
      case "phones":
        setDncPhones((prev) => prev.filter((p) => p !== item));
        break;
    }
  };

  // -- Modal renderer --
  const renderModal = () => {
    if (!activeModal) return null;

    const closeModal = () => {
      setActiveModal(null);
      setMailboxEmail("");
      setSignatureHtml("");
      setCoachingInput("");
      setProofTitleInput("");
      setProofDescInput("");
      setEscalationInput("");
      setKnowledgeTitleInput("");
      setKnowledgeContentInput("");
      setReplyCoachingTitleInput("");
      setReplyCoachingContentInput("");
      setQualificationTitleInput("");
      setQualificationContentInput("");
      setDncInput("");
      setBannedPhraseInput("");
    };

    const modalWrapper = (title: string, content: React.ReactNode, footer: React.ReactNode) => (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
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

    switch (activeModal) {
      case "connectMailbox":
        return modalWrapper(
          "Connect your primary mailbox",
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={mailboxEmail}
                onChange={(e) => setMailboxEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <button className="w-full rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors">
              Connect with Google
            </button>
            <div className="text-center">
              <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">Connect manually</button>
            </div>
          </div>,
          <>{cancelBtn}</>
        );

      case "setupSignature":
        return modalWrapper(
          "Set up email signature",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signature HTML</label>
            <textarea
              value={signatureHtml}
              onChange={(e) => setSignatureHtml(e.target.value)}
              placeholder="Paste your email signature HTML here..."
              rows={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={closeModal}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "buyMailboxes":
        return modalWrapper(
          "Purchase additional mailboxes",
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMailboxQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-semibold text-gray-900 min-w-[2rem] text-center">
                  {mailboxQuantity}
                </span>
                <button
                  onClick={() => setMailboxQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Price per mailbox</span>
                <span>&#8377;580/mo</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-900 mt-2 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>&#8377;{(580 * mailboxQuantity).toLocaleString("en-IN")}/mo</span>
              </div>
            </div>
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={closeModal}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Purchase
            </button>
          </>
        );

      case "enableAutopilot":
        return modalWrapper(
          "Enable autopilot mode?",
          <p className="text-sm text-gray-600">
            Arya will run outbound end-to-end without your approval. You can disable this at any time.
          </p>,
          <>
            {cancelBtn}
            <button
              onClick={closeModal}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Enable autopilot
            </button>
          </>
        );

      case "addCoachingPoint":
        return modalWrapper(
          "Add coaching point",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coaching instruction</label>
            <textarea
              value={coachingInput}
              onChange={(e) => setCoachingInput(e.target.value)}
              placeholder="Enter coaching instruction for Arya..."
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (coachingInput.trim()) {
                  setCoachingPoints((prev) => [...prev, { id: genId(), title: coachingInput.trim() }]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "addProof":
        return modalWrapper(
          "Add proof",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={proofTitleInput}
                onChange={(e) => setProofTitleInput(e.target.value)}
                placeholder="e.g. 50% conversion rate increase"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={proofDescInput}
                onChange={(e) => setProofDescInput(e.target.value)}
                placeholder="Describe the proof point..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (proofTitleInput.trim()) {
                  setProofItems((prev) => [
                    ...prev,
                    { id: genId(), title: proofTitleInput.trim(), content: proofDescInput.trim() },
                  ]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "addEscalationRule":
        return modalWrapper(
          "Add escalation rule",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule</label>
            <textarea
              value={escalationInput}
              onChange={(e) => setEscalationInput(e.target.value)}
              placeholder="Describe when Arya should escalate..."
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (escalationInput.trim()) {
                  setCustomEscalationRules((prev) => [...prev, escalationInput.trim()]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
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
                value={knowledgeTitleInput}
                onChange={(e) => setKnowledgeTitleInput(e.target.value)}
                placeholder="e.g. Product pricing FAQ"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={knowledgeContentInput}
                onChange={(e) => setKnowledgeContentInput(e.target.value)}
                placeholder="Enter knowledge content..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (knowledgeTitleInput.trim()) {
                  setKnowledgeItems((prev) => [
                    ...prev,
                    { id: genId(), title: knowledgeTitleInput.trim(), content: knowledgeContentInput.trim() },
                  ]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "addCoachingItem":
        return modalWrapper(
          "Add coaching item",
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={replyCoachingTitleInput}
                onChange={(e) => setReplyCoachingTitleInput(e.target.value)}
                placeholder="e.g. Tone of voice"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={replyCoachingContentInput}
                onChange={(e) => setReplyCoachingContentInput(e.target.value)}
                placeholder="Enter coaching content..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (replyCoachingTitleInput.trim()) {
                  setReplyCoachingItems((prev) => [
                    ...prev,
                    { id: genId(), title: replyCoachingTitleInput.trim(), content: replyCoachingContentInput.trim() },
                  ]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
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
                value={qualificationTitleInput}
                onChange={(e) => setQualificationTitleInput(e.target.value)}
                placeholder="e.g. Minimum company size"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={qualificationContentInput}
                onChange={(e) => setQualificationContentInput(e.target.value)}
                placeholder="Enter criterion details..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (qualificationTitleInput.trim()) {
                  setQualificationItems((prev) => [
                    ...prev,
                    {
                      id: genId(),
                      title: qualificationTitleInput.trim(),
                      content: qualificationContentInput.trim(),
                    },
                  ]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "manageLists":
        return modalWrapper(
          "Manage DNC Lists",
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email addresses</span>
                <span className="text-xs text-gray-500">{dncEmails.length} entries</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Company domains</span>
                <span className="text-xs text-gray-500">{dncDomains.length} entries</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Phone numbers</span>
                <span className="text-xs text-gray-500">{dncPhones.length} entries</span>
              </div>
            </div>
          </div>,
          <>{cancelBtn}</>
        );

      case "addDncEmail":
        return modalWrapper(
          "Add email address",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={dncInput}
              onChange={(e) => setDncInput(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (dncInput.trim()) {
                  setDncEmails((prev) => [...prev, dncInput.trim()]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "addDncDomain":
        return modalWrapper(
          "Add company domain",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company domain</label>
            <input
              type="text"
              value={dncInput}
              onChange={(e) => setDncInput(e.target.value)}
              placeholder="example.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (dncInput.trim()) {
                  setDncDomains((prev) => [...prev, dncInput.trim()]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "addDncPhone":
        return modalWrapper(
          "Add phone number",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="tel"
              value={dncInput}
              onChange={(e) => setDncInput(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (dncInput.trim()) {
                  setDncPhones((prev) => [...prev, dncInput.trim()]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      case "addBannedPhrase":
        return modalWrapper(
          "Add banned phrase",
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phrase</label>
            <textarea
              value={bannedPhraseInput}
              onChange={(e) => setBannedPhraseInput(e.target.value)}
              placeholder="Enter a phrase Arya should never use..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>,
          <>
            {cancelBtn}
            <button
              onClick={() => {
                if (bannedPhraseInput.trim()) {
                  setBannedPhrases((prev) => [...prev, bannedPhraseInput.trim()]);
                  closeModal();
                }
              }}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0]"
            >
              Save
            </button>
          </>
        );

      default:
        return null;
    }
  };

  // -- Reusable list item renderer with edit/delete --
  const renderListItems = (
    items: ListItem[],
    setItems: React.Dispatch<React.SetStateAction<ListItem[]>>
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2 mt-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <span className="text-sm text-gray-700">{item.title}</span>
              {item.content && <p className="text-xs text-gray-500 mt-0.5">{item.content}</p>}
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <button
                onClick={() => {
                  const newTitle = prompt("Edit item:", item.title);
                  if (newTitle !== null && newTitle.trim()) {
                    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, title: newTitle.trim() } : i)));
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Arya</h1>
        <Link
          href="/campaigns"
          className="rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
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

      {/* ======================== OVERVIEW TAB ======================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Onboarding Quests */}
          {!isQuestsHidden && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-gray-900">Onboarding quests</h2>
                  <span className="text-sm text-gray-500">
                    {completedQuests.size}/{totalQuests} complete
                  </span>
                </div>
                <button
                  onClick={() => setIsQuestsHidden(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full mb-5">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Remaining toggle */}
              <button
                onClick={() => setShowRemaining(!showRemaining)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4"
              >
                Remaining
                {showRemaining ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showRemaining && (
                <div className="space-y-4">
                  {allQuests.map((quest) => (
                    <div key={quest.title} className="flex items-center gap-4 py-2">
                      {/* Checkbox circle */}
                      <button
                        onClick={() => toggleQuest(quest.title)}
                        className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          completedQuests.has(quest.title)
                            ? "border-violet-600 bg-violet-600"
                            : "border-gray-300 hover:border-violet-400"
                        }`}
                      >
                        {completedQuests.has(quest.title) && <Check className="h-3 w-3 text-white" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium text-sm ${
                              completedQuests.has(quest.title)
                                ? "text-gray-400 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {quest.title}
                          </span>
                          {quest.next && !completedQuests.has(quest.title) && (
                            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              Next
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{quest.description}</p>
                      </div>

                      {/* Credits */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs text-gray-600">Earn {quest.credits} credits</span>
                      </div>

                      {/* Action button */}
                      <button
                        onClick={() => handleQuestAction(quest.action)}
                        className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {quest.action}
                      </button>
                    </div>
                  ))}

                  {!showMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => setShowMore(true)}
                        className="text-sm font-medium text-violet-600 hover:text-violet-700"
                      >
                        Load more (8)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show quests button when hidden */}
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
              <div className="flex items-center gap-3">
                {/* Time period dropdown */}
                <div className="relative" ref={timePeriodRef}>
                  <button
                    onClick={() => {
                      setTimePeriodOpen(!timePeriodOpen);
                      setSenderOpen(false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {timePeriod}
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {timePeriodOpen && (
                    <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                      {timePeriodOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setTimePeriod(option);
                            setTimePeriodOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            timePeriod === option ? "text-violet-600 font-medium" : "text-gray-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Senders dropdown */}
                <div className="relative" ref={senderRef}>
                  <button
                    onClick={() => {
                      setSenderOpen(!senderOpen);
                      setTimePeriodOpen(false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {sender}
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {senderOpen && (
                    <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                      {senderOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSender(option);
                            setSenderOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            sender === option ? "text-violet-600 font-medium" : "text-gray-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Link href="/analytics" className="text-sm font-medium text-violet-600 hover:text-violet-700">
                  View all
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: UserPlus, label: "New leads enrolled", value: "0" },
                { icon: Send, label: "Messages sent", value: "0" },
                { icon: MessageCircle, label: "Positive responses", value: "0" },
                { icon: Calendar, label: "Meetings booked", value: "0" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
                  <stat.icon className="h-5 w-5 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Arya needs input on */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-6">Tasks Arya needs input on</h2>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium text-gray-900">No tasks right now</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                When Arya needs your input on messages or approvals, they will show up here.
              </p>
            </div>
          </div>

          {/* Top Performing Campaigns */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-6">Arya&apos;s top performing campaigns</h2>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Target className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium text-gray-900">No campaigns yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Top performing campaigns will appear here once you have activity.
              </p>
            </div>
          </div>

          {/* Latest Activity */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-6">Arya&apos;s latest activity</h2>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium text-gray-900">No activity yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Arya&apos;s recent emails, responses, and enrichments will show up here.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================== OUTBOUND SEQUENCES TAB ======================== */}
      {activeTab === "outbound" && (
        <div className="space-y-6">
          {/* Sub-tabs */}
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
                    onClick={() => {
                      setCoachingInput("");
                      setActiveModal("addCoachingPoint");
                    }}
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
                        onClick={() => {
                          setCoachingInput("");
                          setActiveModal("addCoachingPoint");
                        }}
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

              {/* Shared proof & results */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="font-bold text-gray-900">Shared proof &amp; results</h2>
                  <button
                    onClick={() => {
                      setProofTitleInput("");
                      setProofDescInput("");
                      setActiveModal("addProof");
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    + Add proof
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">Wins, customers, and case studies Arya can mention.</p>

                {/* Proof sub-tabs */}
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
                  <div className="space-y-2">
                    {highlightsList.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                      >
                        {editingHighlightIndex === index ? (
                          <input
                            type="text"
                            value={editingHighlightValue}
                            onChange={(e) => setEditingHighlightValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editingHighlightValue.trim()) {
                                setHighlightsList((prev) =>
                                  prev.map((h, i) => (i === index ? editingHighlightValue.trim() : h))
                                );
                                setEditingHighlightIndex(null);
                              }
                              if (e.key === "Escape") {
                                setEditingHighlightIndex(null);
                              }
                            }}
                            autoFocus
                            className="flex-1 text-sm text-gray-700 border border-violet-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-700">{item}</span>
                        )}
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => {
                              if (editingHighlightIndex === index) {
                                setEditingHighlightIndex(null);
                              } else {
                                setEditingHighlightIndex(index);
                                setEditingHighlightValue(item);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setHighlightsList((prev) => prev.filter((_, i) => i !== index));
                              if (editingHighlightIndex === index) setEditingHighlightIndex(null);
                            }}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Show proof items added via modal */}
                    {proofItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-gray-700">{item.title}</span>
                          {item.content && <p className="text-xs text-gray-500 mt-0.5">{item.content}</p>}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => {
                              const newTitle = prompt("Edit proof:", item.title);
                              if (newTitle !== null && newTitle.trim()) {
                                setProofItems((prev) =>
                                  prev.map((p) => (p.id === item.id ? { ...p, title: newTitle.trim() } : p))
                                );
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setProofItems((prev) => prev.filter((p) => p.id !== item.id))}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {proofSub === "customers" && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm text-gray-500">No customers added yet.</p>
                  </div>
                )}

                {proofSub === "case-studies" && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm text-gray-500">No case studies added yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {outboundSub === "defaults" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-gray-500">Default settings will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* ======================== AUTONOMOUS REPLIES TAB ======================== */}
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
              {/* Default locked rules */}
              {defaultEscalationRules.map((rule) => (
                <div
                  key={rule}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <span className="text-sm text-gray-700">{rule}</span>
                  <Lock className="h-4 w-4 text-gray-400 shrink-0 ml-4" />
                </div>
              ))}
              {/* Custom rules (editable) */}
              {customEscalationRules.map((rule, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <span className="text-sm text-gray-700">{rule}</span>
                  <button
                    onClick={() => setCustomEscalationRules((prev) => prev.filter((_, i) => i !== index))}
                    className="p-1 text-red-400 hover:text-red-600 shrink-0 ml-4"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setEscalationInput("");
                setActiveModal("addEscalationRule");
              }}
              className="mt-4 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              + Add escalation rule
            </button>
          </div>

          {/* Knowledge base */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Knowledge base</h2>
            <p className="text-sm text-gray-500 mb-5">Give Arya more context about your campaigns.</p>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Learn from past conversations</p>
                <p className="text-xs text-gray-500 mt-0.5">Allow Arya to learn from previous email threads</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => setPastConversationsEnabled(!pastConversationsEnabled)}
                className={`h-5 w-9 rounded-full relative cursor-pointer transition-colors ${
                  pastConversationsEnabled ? "bg-violet-600" : "bg-gray-200"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    pastConversationsEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <button
              onClick={() => {
                setKnowledgeTitleInput("");
                setKnowledgeContentInput("");
                setActiveModal("addKnowledge");
              }}
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
              onClick={() => {
                setReplyCoachingTitleInput("");
                setReplyCoachingContentInput("");
                setActiveModal("addCoachingItem");
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add coaching item
            </button>
            {renderListItems(replyCoachingItems, setReplyCoachingItems)}
          </div>

          {/* Qualification criteria */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Qualification criteria</h2>
            <p className="text-sm text-gray-500 mb-5">
              Arya will first do web research to confirm if the lead meets qualification criteria.
            </p>
            <button
              onClick={() => {
                setQualificationTitleInput("");
                setQualificationContentInput("");
                setActiveModal("addQualification");
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add qualification criterion
            </button>
            {renderListItems(qualificationItems, setQualificationItems)}
          </div>
        </div>
      )}

      {/* ======================== GUARDRAILS TAB ======================== */}
      {activeTab === "guardrails" && (
        <div className="space-y-6">
          {/* Sub-tabs */}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveModal("manageLists")}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Manage lists
                  </button>
                  {/* + Add dropdown */}
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
                            setDncInput("");
                            setActiveModal("addDncEmail");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Add email address
                        </button>
                        <button
                          onClick={() => {
                            setDncAddOpen(false);
                            setDncInput("");
                            setActiveModal("addDncDomain");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Add company domain
                        </button>
                        <button
                          onClick={() => {
                            setDncAddOpen(false);
                            setDncInput("");
                            setActiveModal("addDncPhone");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Add phone number
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DNC inner tabs */}
              <div className="border-b border-gray-200 mb-4">
                <div className="flex gap-6">
                  {(
                    [
                      { key: "emails", label: "Email addresses" },
                      { key: "domains", label: "Company domains" },
                      { key: "phones", label: "Phone numbers" },
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

              {/* Search bar */}
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
                        : dncSub === "phones"
                          ? "phone numbers"
                          : "CRM entries"
                  }...`}
                  className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* DNC list items or empty state */}
              {dncSub !== "crm" && getCurrentDncList().length > 0 ? (
                <div className="space-y-2">
                  {getCurrentDncList().map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                    >
                      <span className="text-sm text-gray-700">{item}</span>
                      <button
                        onClick={() => removeDncItem(item)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-900">
                    No{" "}
                    {dncSub === "emails"
                      ? "email addresses"
                      : dncSub === "domains"
                        ? "company domains"
                        : dncSub === "phones"
                          ? "phone numbers"
                          : "CRM entries"}{" "}
                    in DNC list
                  </p>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    Add{" "}
                    {dncSub === "emails"
                      ? "email addresses"
                      : dncSub === "domains"
                        ? "company domains"
                        : dncSub === "phones"
                          ? "phone numbers"
                          : "CRM entries"}{" "}
                    to prevent contacting them
                  </p>
                </div>
              )}
            </div>
          )}

          {guardrailsSub === "banned" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm text-gray-500">Arya will never use these phrases in outreach.</p>
                <button
                  onClick={() => {
                    setBannedPhraseInput("");
                    setActiveModal("addBannedPhrase");
                  }}
                  className="rounded-lg bg-[#6C47FF] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
                >
                  + Add phrase
                </button>
              </div>

              {/* Search bar */}
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

              {/* Banned phrases list or empty state */}
              {filteredBannedPhrases.length > 0 ? (
                <div className="space-y-2">
                  {filteredBannedPhrases.map((phrase, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                    >
                      <span className="text-sm text-gray-700">{phrase}</span>
                      <button
                        onClick={() => setBannedPhrases((prev) => prev.filter((p) => p !== phrase))}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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

      {/* ======================== MODALS ======================== */}
      {renderModal()}
    </div>
  );
}
