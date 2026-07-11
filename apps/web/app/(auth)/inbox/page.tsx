"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Inbox,
  MessageCircle,
  SlidersHorizontal,
  MoreHorizontal,
  Check,
  RefreshCw,
  Send,
  CheckCheck,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = "needs-action" | "no-action" | "sent";

type InboxItem = {
  id: string;
  name: string;
  company: string;
  subject: string;
  preview: string;
  time: string; // ISO timestamp
  date: string; // ISO timestamp (same as time — kept for sort/filter clarity)
  status: string; // intent for replies, "sent" for sent messages
  intent: string | null;
  campaign: string;
  tab: Tab;
  isRead?: boolean;
  aiSuggestedReply?: string | null;
};

/* ------------------------------------------------------------------ */
/*  Status filter config — maps UI labels to the AI reply-classifier's */
/*  actual `intent` vocabulary (see agent-service prompts/messaging.py) */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { id: "interested", label: "Interested", dot: "bg-green-500", intent: "interested" },
  { id: "meeting-booked", label: "Meeting booked", dot: "bg-green-500", intent: "schedule_meeting" },
  { id: "ask-more-info", label: "Wants more info", dot: null, intent: "ask_more_info" },
  { id: "referral", label: "Referral", dot: null, intent: "referral" },
  { id: "out-of-office", label: "Out of office", dot: "bg-orange-500", intent: "out_of_office" },
  { id: "not-interested", label: "Not interested", dot: "bg-orange-500", intent: "not_interested" },
];

/* ------------------------------------------------------------------ */
/*  Inbox Page                                                         */
/* ------------------------------------------------------------------ */

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>("needs-action");
  const [searchQuery, setSearchQuery] = useState("");

  /* data */
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);

  /* filters */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set()
  );
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    statuses: Set<string>;
    campaign: string;
    dateStart: string;
    dateEnd: string;
  }>({
    statuses: new Set(),
    campaign: "",
    dateStart: "",
    dateEnd: "",
  });
  const filtersRef = useRef<HTMLDivElement | null>(null);

  /* three-dot tab menu */
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const tabMenuRef = useRef<HTMLDivElement | null>(null);

  /* selected conversation */
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [markingActed, setMarkingActed] = useState(false);

  /* sort */
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  /* ---- data loading ---- */
  const loadItems = useCallback(async (tab: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/inbox?tab=${tab}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setItems(Array.isArray(json) ? json : []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
      toast.error("Could not load inbox");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems(activeTab);
    setSelectedItem(null);
  }, [activeTab, loadItems]);

  useEffect(() => {
    fetch("/api/v1/integrations/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setGmailConnected(!!json.gmail))
      .catch(() => setGmailConnected(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/v1/inbox/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Sync failed");
        return;
      }
      toast.success(
        json.created > 0
          ? `Synced ${json.created} new repl${json.created === 1 ? "y" : "ies"}`
          : "No new replies"
      );
      loadItems(activeTab);
    } catch {
      toast.error("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  /* ---- click outside handlers ---- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(e.target as Node)
      ) {
        setFiltersOpen(false);
      }
      if (
        tabMenuRef.current &&
        !tabMenuRef.current.contains(e.target as Node)
      ) {
        setTabMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---- filtering logic ---- */
  const campaignOptions = Array.from(
    new Set(items.map((i) => i.campaign).filter(Boolean))
  );

  const filteredItems = items
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q)
      );
    })
    .filter((item) => {
      if (appliedFilters.statuses.size > 0) {
        const matchesIntent = Array.from(appliedFilters.statuses).some(
          (id) => STATUS_OPTIONS.find((s) => s.id === id)?.intent === item.intent
        );
        if (!matchesIntent) return false;
      }
      if (appliedFilters.campaign && item.campaign !== appliedFilters.campaign)
        return false;
      if (appliedFilters.dateStart && item.date < appliedFilters.dateStart)
        return false;
      if (appliedFilters.dateEnd && item.date > appliedFilters.dateEnd)
        return false;
      return true;
    })
    .sort((a, b) =>
      sortOrder === "newest"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );

  /* ---- filter helpers ---- */
  function toggleStatus(id: string) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetFilters() {
    setSelectedStatuses(new Set());
    setFilterCampaign("");
    setFilterDateStart("");
    setFilterDateEnd("");
  }

  function applyFilters() {
    setAppliedFilters({
      statuses: new Set(selectedStatuses),
      campaign: filterCampaign,
      dateStart: filterDateStart,
      dateEnd: filterDateEnd,
    });
    setFiltersOpen(false);
  }

  async function markAsRead(item: InboxItem) {
    if (item.tab === "sent" || item.isRead) return;
    try {
      await fetch(`/api/v1/inbox/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
      );
    } catch {
      // non-critical — read state will just refresh on next reload
    }
  }

  function selectItem(item: InboxItem) {
    setSelectedItem(item);
    setReplyDraft(item.aiSuggestedReply ?? "");
    markAsRead(item);
  }

  async function markAllAsRead() {
    const unread = filteredItems.filter((i) => i.tab !== "sent" && !i.isRead);
    if (unread.length === 0) {
      setTabMenuOpen(false);
      return;
    }
    try {
      await Promise.all(
        unread.map((item) =>
          fetch(`/api/v1/inbox/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "read" }),
          })
        )
      );
      setItems((prev) =>
        prev.map((i) => (unread.some((u) => u.id === i.id) ? { ...i, isRead: true } : i))
      );
      toast.success(`Marked ${unread.length} as read`);
    } catch {
      toast.error("Could not mark all as read");
    } finally {
      setTabMenuOpen(false);
    }
  }

  async function handleMarkNoActionNeeded() {
    if (!selectedItem) return;
    setMarkingActed(true);
    try {
      const res = await fetch(`/api/v1/inbox/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acted" }),
      });
      if (!res.ok) {
        toast.error("Could not update this conversation");
        return;
      }
      toast.success("Moved to No action");
      setSelectedItem(null);
      loadItems(activeTab);
    } catch {
      toast.error("Could not update this conversation");
    } finally {
      setMarkingActed(false);
    }
  }

  async function handleSendReply() {
    if (!selectedItem || !replyDraft.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/v1/inbox/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", replyBody: replyDraft.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Could not send reply");
        return;
      }
      toast.success("Reply sent");
      setSelectedItem(null);
      setReplyDraft("");
      loadItems(activeTab);
    } catch {
      toast.error("Could not send reply");
    } finally {
      setSendingReply(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "needs-action", label: "Needs action" },
    { id: "no-action", label: "No action" },
    { id: "sent", label: "Sent" },
  ];

  const activeFilterCount =
    appliedFilters.statuses.size +
    (appliedFilters.campaign ? 1 : 0) +
    (appliedFilters.dateStart ? 1 : 0) +
    (appliedFilters.dateEnd ? 1 : 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* ---- LEFT PANEL ---- */}
      <div className="w-[370px] flex flex-col border-r border-gray-200">
        {/* Tabs + Menu */}
        <div className="flex items-center justify-between px-4 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedItem(null);
                }}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-violet-600 text-violet-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 pb-3">
            <button
              onClick={handleSync}
              disabled={syncing || gmailConnected === false}
              title={
                gmailConnected === false
                  ? "Connect Gmail to sync replies"
                  : "Check Gmail for new replies"
              }
              className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </button>

            {/* three-dot menu */}
            <div className="relative" ref={tabMenuRef}>
              <button
                onClick={() => setTabMenuOpen(!tabMenuOpen)}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {tabMenuOpen && (
                <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={markAllAsRead}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Mark all as read
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder("newest");
                      setTabMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Sort by newest
                    {sortOrder === "newest" && (
                      <Check className="h-3.5 w-3.5 text-violet-600" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSortOrder("oldest");
                      setTabMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Sort by oldest
                    {sortOrder === "oldest" && (
                      <Check className="h-3.5 w-3.5 text-violet-600" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
            />
          </div>

          <div className="mt-3 mb-3 relative" ref={filtersRef}>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                activeFilterCount > 0
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filters dropdown panel */}
            {filtersOpen && (
              <div className="absolute left-0 top-10 z-30 w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                {/* Status checkboxes */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Status
                  </p>
                  <div className="space-y-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStatuses.has(opt.id)}
                          onChange={() => toggleStatus(opt.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                        />
                        {opt.dot && (
                          <span
                            className={`h-2 w-2 rounded-full ${opt.dot}`}
                          />
                        )}
                        <span className="text-sm text-gray-700">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Campaign dropdown */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Campaign
                  </p>
                  <select
                    value={filterCampaign}
                    onChange={(e) => setFilterCampaign(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                  >
                    <option value="">All campaigns</option>
                    {campaignOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Date range
                  </p>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start date</label>
                      <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End date</label>
                      <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={applyFilters}
                    className="rounded-lg bg-[#6C47FF] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inbox items list */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-gray-300 animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => selectItem(item)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedItem?.id === item.id ? "bg-violet-50" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm truncate ${
                      item.isRead === false ? "font-bold text-gray-900" : "font-semibold text-gray-900"
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {new Date(item.time).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{item.company}</p>
                <p className="text-sm text-gray-700 truncate mt-0.5">
                  {item.subject}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {item.preview}
                </p>
              </button>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <Inbox className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {searchQuery || activeFilterCount > 0
                ? "No results found"
                : "Inbox zero... Feels good right?"}
            </p>
            {(searchQuery || activeFilterCount > 0) && (
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your search or filters.
              </p>
            )}
            {!searchQuery && activeFilterCount === 0 && gmailConnected === false && (
              <p className="text-xs text-gray-400 mt-2">
                <Link href="/settings/integrations" className="text-violet-600 hover:underline">
                  Connect Gmail
                </Link>{" "}
                to start receiving replies here.
              </p>
            )}
            {!searchQuery && activeFilterCount === 0 && gmailConnected === true && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-3 text-xs text-violet-600 hover:underline disabled:opacity-50"
              >
                {syncing ? "Checking Gmail…" : "Check for new replies"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- RIGHT PANEL ---- */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {selectedItem ? (
          <div className="w-full h-full flex flex-col p-6 overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedItem.name}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedItem.company}
                {selectedItem.campaign ? ` · ${selectedItem.campaign}` : ""}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {selectedItem.subject}
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedItem.preview}</p>
            </div>

            {selectedItem.tab !== "sent" && (
              <div className="mt-4 flex flex-col gap-3">
                <textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  rows={5}
                  placeholder="Write a reply..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyDraft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a39dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send reply
                  </button>
                  {activeTab === "needs-action" && (
                    <button
                      onClick={handleMarkNoActionNeeded}
                      disabled={markingActed}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      No action needed
                    </button>
                  )}
                </div>
                {gmailConnected === false && (
                  <p className="text-xs text-amber-600">
                    Connect Gmail in{" "}
                    <Link href="/settings/integrations" className="underline">
                      Integrations
                    </Link>{" "}
                    to actually send this reply.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <MessageCircle className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Select a chat to view</p>
          </>
        )}
      </div>
    </div>
  );
}
