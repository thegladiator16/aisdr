"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Intent = "hot" | "warm" | "cold";
type Tone = "professional" | "friendly" | "bold";

interface Message {
  id: string;
  sender: "lead" | "user";
  senderName: string;
  body: string;
  timestamp: string;
}

interface Thread {
  id: string;
  leadName: string;
  company: string;
  email: string;
  subject: string;
  preview: string;
  timeAgo: string;
  intent: Intent;
  unread: boolean;
  messages: Message[];
  suggestedReply: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_THREADS: Thread[] = [
  {
    id: "t1",
    leadName: "Sarah Chen",
    company: "Stripe",
    email: "sarah.chen@stripe.com",
    subject: "Re: Automating your outbound pipeline",
    preview: "This looks really interesting, can we set up a call next week?",
    timeAgo: "2h ago",
    intent: "hot",
    unread: true,
    messages: [
      {
        id: "m1a",
        sender: "user",
        senderName: "You",
        body: "Hi Sarah, I noticed Stripe is scaling its sales team. Our AI SDR platform automates personalized outreach at scale and I'd love to show you how it could help your team hit quota faster.",
        timestamp: "Jun 12, 10:30 AM",
      },
      {
        id: "m1b",
        sender: "lead",
        senderName: "Sarah Chen",
        body: "This looks really interesting, can we set up a call next week? We're actively evaluating tools to help our BDR team be more efficient.",
        timestamp: "Jun 12, 2:15 PM",
      },
    ],
    suggestedReply:
      "Absolutely, Sarah! I'd love to walk you through a quick demo. How does Tuesday or Wednesday afternoon work for you? I can send over a calendar link.",
  },
  {
    id: "t2",
    leadName: "Marcus Johnson",
    company: "HubSpot",
    email: "m.johnson@hubspot.com",
    subject: "Re: Quick question about AI-driven outreach",
    preview: "Interesting, what kind of reply rates are your customers seeing?",
    timeAgo: "5h ago",
    intent: "warm",
    unread: true,
    messages: [
      {
        id: "m2a",
        sender: "user",
        senderName: "You",
        body: "Hi Marcus, I saw your recent post about scaling outbound. We help teams like yours achieve 3x reply rates using AI-personalized sequences. Worth a quick chat?",
        timestamp: "Jun 11, 3:00 PM",
      },
      {
        id: "m2b",
        sender: "lead",
        senderName: "Marcus Johnson",
        body: "Interesting, what kind of reply rates are your customers seeing? We've been struggling to break past 4% on cold outreach.",
        timestamp: "Jun 12, 9:45 AM",
      },
    ],
    suggestedReply:
      "Great question, Marcus! Our customers typically see 12-18% reply rates, up from 3-5% with traditional methods. The AI personalizes each email based on the prospect's recent activity and company news. Happy to share a case study from a similar team.",
  },
  {
    id: "t3",
    leadName: "Emily Rodriguez",
    company: "Notion",
    email: "emily.r@notion.so",
    subject: "Re: Outbound automation for growing teams",
    preview: "Thanks but we just signed with another vendor last month.",
    timeAgo: "1d ago",
    intent: "cold",
    unread: false,
    messages: [
      {
        id: "m3a",
        sender: "user",
        senderName: "You",
        body: "Hi Emily, congrats on Notion's Series C! As you scale your go-to-market team, our AI SDR platform could help you ramp new reps 2x faster. Would love to connect.",
        timestamp: "Jun 10, 11:00 AM",
      },
      {
        id: "m3b",
        sender: "lead",
        senderName: "Emily Rodriguez",
        body: "Thanks but we just signed with another vendor last month. Maybe we can revisit in Q1 next year when our contract is up for renewal.",
        timestamp: "Jun 11, 4:30 PM",
      },
    ],
    suggestedReply:
      "No worries at all, Emily! I completely understand. I'll set a reminder to reach out in Q1. In the meantime, feel free to reach out if anything changes. Wishing you and the Notion team continued success!",
  },
  {
    id: "t4",
    leadName: "David Park",
    company: "Figma",
    email: "david.park@figma.com",
    subject: "Re: Scaling outbound without scaling headcount",
    preview: "This is exactly what we need. Can you send pricing?",
    timeAgo: "3h ago",
    intent: "hot",
    unread: true,
    messages: [
      {
        id: "m4a",
        sender: "user",
        senderName: "You",
        body: "Hi David, I know Figma is growing fast. Our platform lets one SDR do the work of five with fully AI-driven prospecting, personalization, and follow-ups. Interested in learning more?",
        timestamp: "Jun 12, 8:00 AM",
      },
      {
        id: "m4b",
        sender: "lead",
        senderName: "David Park",
        body: "This is exactly what we need. Can you send pricing? We have a team of 8 SDRs and want to understand ROI before our budget review next week.",
        timestamp: "Jun 12, 11:20 AM",
      },
    ],
    suggestedReply:
      "Great to hear, David! I'll send over our pricing guide right away. For a team of 8, our Growth plan would be the best fit. Most teams see 3-4x ROI within the first quarter. I'll include a custom ROI calculator with the pricing info.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const INTENT_CONFIG: Record<Intent, { label: string; dot: string; bg: string; text: string }> = {
  hot: { label: "Hot", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  warm: { label: "Warm", dot: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" },
  cold: { label: "Cold", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
};

const TONE_LABELS: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "bold", label: "Bold" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_THREADS[0].id);
  const [filter, setFilter] = useState<"all" | Intent>("all");
  const [search, setSearch] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [draftReply, setDraftReply] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const selected = threads.find((t) => t.id === selectedId) ?? threads[0];

  // Sync draft reply when selected thread changes
  useEffect(() => {
    if (selected) setDraftReply(selected.suggestedReply);
  }, [selected?.id]);

  // Try fetching real data (falls back to mock)
  useEffect(() => {
    fetch("/api/v1/inbox")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Map API data to Thread shape if we ever get real data
          // For now the mock data will display
        }
      })
      .catch(() => {});
  }, []);

  /* Filtered + searched threads */
  const visible = threads.filter((t) => {
    if (filter !== "all" && t.intent !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.leadName.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  /* Regenerate handler */
  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/inbox/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selected.id, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraftReply(data.reply);
      }
    } catch {
      // Fallback: simulate with timeout
      await new Promise((r) => setTimeout(r, 1200));
      setDraftReply(selected.suggestedReply);
    } finally {
      setRegenerating(false);
    }
  };

  /* Mark as read on select */
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: false } : t))
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* ---- LEFT PANEL: Thread List ---- */}
      <div className="w-[40%] flex flex-col border-r border-gray-200">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {threads.filter((t) => t.unread).length} unread conversations
          </p>
        </div>

        {/* Intent filter tabs */}
        <div className="flex gap-1 px-5 pb-3">
          {(["all", "hot", "warm", "cold"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-[#6C47FF] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {f === "all" ? "All" : (
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", INTENT_CONFIG[f].dot)} />
                  {INTENT_CONFIG[f].label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <p className="text-sm text-gray-500">No conversations found</p>
            </div>
          ) : (
            visible.map((t) => {
              const active = t.id === selectedId;
              const cfg = INTENT_CONFIG[t.intent];
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={cn(
                    "w-full text-left px-5 py-3.5 border-l-[3px] transition-colors",
                    active
                      ? "border-l-[#6C47FF] bg-violet-50/60"
                      : "border-l-transparent hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {t.unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                        <span className={cn("text-sm font-semibold truncate", t.unread ? "text-gray-900" : "text-gray-700")}>
                          {t.leadName}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          {t.company}
                        </span>
                      </div>
                      <p className={cn("text-sm truncate mt-0.5", t.unread ? "font-medium text-gray-800" : "text-gray-600")}>
                        {t.subject}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {t.preview}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] text-gray-400">{t.timeAgo}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", cfg.bg, cfg.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ---- RIGHT PANEL: Thread Detail ---- */}
      <div className="w-[60%] flex flex-col">
        {selected ? (
          <>
            {/* Thread header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {selected.leadName}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selected.email} &middot; {selected.company}
              </p>
              <p className="text-sm text-gray-700 mt-1">{selected.subject}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {selected.messages.map((msg) => {
                const isSent = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isSent ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-3",
                        isSent
                          ? "bg-[#6C47FF] text-white rounded-br-md"
                          : "bg-gray-100 text-gray-800 rounded-bl-md"
                      )}
                    >
                      <p className={cn("text-xs font-medium mb-1", isSent ? "text-violet-200" : "text-gray-500")}>
                        {msg.senderName}
                      </p>
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                      <p className={cn("text-[11px] mt-2", isSent ? "text-violet-200" : "text-gray-400")}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Arya's Suggested Reply */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50/80">
              <div className="flex items-center gap-2 mb-3">
                <AryaAvatar size="sm" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Arya&apos;s Suggested Reply
                  </p>
                  <p className="text-[11px] text-gray-400">AI-generated draft</p>
                </div>
              </div>

              <textarea
                value={draftReply}
                onChange={(e) => setDraftReply(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 leading-relaxed focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF] resize-none"
              />

              {/* Tone selector */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500 mr-1">Tone:</span>
                {TONE_LABELS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      tone === t.value
                        ? "bg-[#6C47FF] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors">
                  Send
                </button>
                <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Edit
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg
                    className={cn("h-3.5 w-3.5", regenerating && "animate-spin")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-gray-400">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
