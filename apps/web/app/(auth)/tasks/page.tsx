"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Send,
  ChevronDown,
  SlidersHorizontal,
  X,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = "outbound" | "manual" | "platform";
type StatusFilter = "pending" | "scheduled";

/* ------------------------------------------------------------------ */
/*  Tasks Page                                                         */
/* ------------------------------------------------------------------ */

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("outbound");
  const [search, setSearch] = useState("");

  /* "All tasks" user dropdown */
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(
    new Set(["shashank-kumar"])
  );
  const allTasksRef = useRef<HTMLDivElement | null>(null);

  /* "Pending" status dropdown */
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const statusRef = useRef<HTMLDivElement | null>(null);

  /* Filters slide-in panel */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterMessageType, setFilterMessageType] = useState("all");
  const [filterCampaign, setFilterCampaign] = useState("none");
  const [filterSequenceStage, setFilterSequenceStage] = useState("none");
  const [filterSender, setFilterSender] = useState("none");
  const [filterLead, setFilterLead] = useState("none");
  const [filterCompany, setFilterCompany] = useState("none");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  /* Approve dropdown */
  const [approveDropdownOpen, setApproveDropdownOpen] = useState(false);
  const approveDropdownRef = useRef<HTMLDivElement | null>(null);

  /* Approve confirmation */
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [approveAction, setApproveAction] = useState<
    "approve" | "schedule" | null
  >(null);

  const pendingCount = 0;

  const USERS = [
    {
      id: "shashank-kumar",
      initials: "SK",
      name: "Shashank Kumar",
      email: "shashank@aryasdr.com",
      isYou: true,
    },
  ];

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "outbound", label: "Outbound to approve", count: 0 },
    { id: "manual", label: "Manual tasks", count: 0 },
    { id: "platform", label: "Platform tasks", count: 0 },
  ];

  /* ---- click outside handlers ---- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        allTasksRef.current &&
        !allTasksRef.current.contains(e.target as Node)
      ) {
        setAllTasksOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (
        approveDropdownRef.current &&
        !approveDropdownRef.current.contains(e.target as Node)
      ) {
        setApproveDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---- filter panel helpers ---- */
  function clearAllFilters() {
    setFilterMessageType("all");
    setFilterCampaign("none");
    setFilterSequenceStage("none");
    setFilterSender("none");
    setFilterLead("none");
    setFilterCompany("none");
    setFilterDateStart("");
    setFilterDateEnd("");
  }

  /* ---- user selection helpers ---- */
  function toggleUser(userId: string) {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function selectAll() {
    setSelectedUsers(new Set(USERS.map((u) => u.id)));
  }

  function clearUsers() {
    setSelectedUsers(new Set());
  }

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tasks</h1>

      {/* Tabs + Controls Row */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        {/* Tabs */}
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}{" "}
              <span
                className={`ml-1 ${
                  activeTab === tab.id ? "text-violet-500" : "text-gray-400"
                }`}
              >
                [{tab.count}]
              </span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 pb-3">
          {/* All tasks dropdown */}
          <div className="relative" ref={allTasksRef}>
            <button
              onClick={() => setAllTasksOpen(!allTasksOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              All tasks
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${allTasksOpen ? "rotate-180" : ""}`}
              />
            </button>

            {allTasksOpen && (
              <div className="absolute left-0 top-10 z-30 w-72 rounded-xl border border-gray-200 bg-white shadow-xl">
                {/* header */}
                <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    View tasks for
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={selectAll}
                      className="text-xs text-[#6C47FF] hover:text-[#5a39dd] font-medium transition-colors"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={clearUsers}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* user rows */}
                <div className="py-1">
                  {USERS.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                      />
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700 flex-shrink-0">
                        {user.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </span>
                          {user.isYou && (
                            <span className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* footer */}
                <div className="px-4 py-2.5 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    {selectedUsers.size} of {USERS.length} users selected
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pending/Scheduled dropdown */}
          <div className="relative" ref={statusRef}>
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors capitalize"
            >
              {statusFilter}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {statusDropdownOpen && (
              <div className="absolute left-0 top-10 z-30 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {(["pending", "scheduled"] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setStatusDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors capitalize"
                  >
                    {status}
                    {statusFilter === status && (
                      <Check className="h-3.5 w-3.5 text-[#6C47FF]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters button */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
        </div>
      </div>

      {/* Search + Approve All */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search lead, company, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
          />
        </div>

        {/* Approve all button + dropdown */}
        <div className="flex items-center">
          <button
            disabled={pendingCount === 0}
            onClick={() => {
              if (pendingCount > 0) {
                setApproveAction("approve");
                setApproveConfirmOpen(true);
              }
            }}
            className={`rounded-l-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap ${
              pendingCount === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#5a3ad4]"
            }`}
          >
            Approve all ({pendingCount})
          </button>

          {/* Dropdown arrow */}
          <div className="relative" ref={approveDropdownRef}>
            <button
              onClick={() => setApproveDropdownOpen(!approveDropdownOpen)}
              className={`rounded-r-lg border-l border-violet-400 bg-[#6C47FF] px-2 py-2 text-white transition-colors ${
                pendingCount === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#5a3ad4]"
              }`}
              disabled={pendingCount === 0}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${approveDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {approveDropdownOpen && pendingCount > 0 && (
              <div className="absolute right-0 top-10 z-30 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setApproveAction("approve");
                    setApproveConfirmOpen(true);
                    setApproveDropdownOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Approve all
                </button>
                <button
                  onClick={() => {
                    setApproveAction("schedule");
                    setApproveConfirmOpen(true);
                    setApproveDropdownOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Schedule all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20">
        <Send className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">
          {activeTab === "outbound"
            ? "No outbound to approve"
            : activeTab === "manual"
              ? "No manual tasks"
              : "No platform tasks"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {activeTab === "outbound"
            ? "Outbound messages waiting for approval will appear here."
            : activeTab === "manual"
              ? "Manual tasks assigned to you will appear here."
              : "Platform tasks will appear here."}
        </p>
      </div>

      {/* ========== FILTERS SLIDE-IN PANEL ========== */}
      {filtersOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setFiltersOpen(false)}
          />

          {/* panel */}
          <div className="fixed top-0 right-0 z-50 h-full w-[360px] bg-white shadow-2xl border-l border-gray-200 flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Message type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message type
                </label>
                <select
                  value={filterMessageType}
                  onChange={(e) => setFilterMessageType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="all">All</option>
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              {/* Campaign */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Campaign
                </label>
                <select
                  value={filterCampaign}
                  onChange={(e) => setFilterCampaign(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="none">None</option>
                </select>
              </div>

              {/* Sequence stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Sequence stage
                </label>
                <select
                  value={filterSequenceStage}
                  onChange={(e) => setFilterSequenceStage(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="none">None</option>
                </select>
              </div>

              {/* Sender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Sender
                </label>
                <select
                  value={filterSender}
                  onChange={(e) => setFilterSender(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="none">None</option>
                </select>
              </div>

              {/* Lead */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lead
                </label>
                <select
                  value={filterLead}
                  onChange={(e) => setFilterLead(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="none">None</option>
                </select>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company
                </label>
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                >
                  <option value="none">None</option>
                </select>
              </div>

              {/* Generated on: date range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Generated on
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">
                      End date
                    </label>
                    <input
                      type="date"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== APPROVE CONFIRMATION MODAL ========== */}
      {approveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {approveAction === "approve"
                ? "Approve all tasks?"
                : "Schedule all tasks?"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {approveAction === "approve"
                ? `This will approve ${pendingCount} pending tasks immediately.`
                : `This will schedule ${pendingCount} pending tasks.`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setApproveConfirmOpen(false);
                  setApproveAction(null);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setApproveConfirmOpen(false);
                  setApproveAction(null);
                }}
                className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors"
              >
                {approveAction === "approve" ? "Approve" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
