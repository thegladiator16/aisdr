"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Inbox,
  MessageCircle,
  SlidersHorizontal,
  MoreHorizontal,
  X,
  Check,
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
  time: string;
  status: string;
  campaign: string;
  tab: Tab;
  date: string;
};

/* ------------------------------------------------------------------ */
/*  Status filter config                                               */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { id: "not-contacted", label: "Not contacted", dot: null },
  { id: "in-sequence", label: "In sequence", dot: null },
  { id: "interested", label: "Interested", dot: "bg-green-500" },
  { id: "meeting-booked", label: "Meeting booked", dot: "bg-green-500" },
  { id: "bad-data", label: "Bad data", dot: "bg-orange-500" },
  { id: "bad-timing", label: "Bad timing", dot: "bg-orange-500" },
];

/* ------------------------------------------------------------------ */
/*  Mock data (for demonstration)                                      */
/* ------------------------------------------------------------------ */

const MOCK_ITEMS: InboxItem[] = [];

/* ------------------------------------------------------------------ */
/*  Inbox Page                                                         */
/* ------------------------------------------------------------------ */

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>("needs-action");
  const [searchQuery, setSearchQuery] = useState("");

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

  /* sort */
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  /* items state */
  const [items] = useState<InboxItem[]>(MOCK_ITEMS);

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
  const filteredItems = items
    .filter((item) => item.tab === activeTab)
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
      if (appliedFilters.statuses.size > 0 && !appliedFilters.statuses.has(item.status))
        return false;
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

          {/* three-dot menu */}
          <div className="relative pb-3" ref={tabMenuRef}>
            <button
              onClick={() => setTabMenuOpen(!tabMenuOpen)}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {tabMenuOpen && (
              <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setTabMenuOpen(false);
                  }}
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
              <div className="absolute left-0 top-10 z-30 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
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
                  </select>
                </div>

                {/* Date range */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Date range
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                      placeholder="Start"
                    />
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                      placeholder="End"
                    />
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
        {filteredItems.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedItem?.id === item.id ? "bg-violet-50" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {item.time}
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
          <div className="flex-1 flex flex-col items-center justify-center px-4">
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
          </div>
        )}
      </div>

      {/* ---- RIGHT PANEL ---- */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {selectedItem ? (
          <div className="w-full h-full flex flex-col p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedItem.name}
              </h2>
              <p className="text-sm text-gray-500">{selectedItem.company}</p>
            </div>
            <div className="flex-1 rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {selectedItem.subject}
              </h3>
              <p className="text-sm text-gray-600">{selectedItem.preview}</p>
            </div>
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
