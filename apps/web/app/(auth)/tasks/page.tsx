"use client";

import { useState } from "react";
import { Search, Send, ChevronDown, SlidersHorizontal } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tasks Page                                                         */
/* ------------------------------------------------------------------ */

type Tab = "outbound" | "manual" | "platform";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("outbound");
  const [search, setSearch] = useState("");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "outbound", label: "Outbound to approve", count: 0 },
    { id: "manual", label: "Manual tasks", count: 0 },
    { id: "platform", label: "Platform tasks", count: 0 },
  ];

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
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            All tasks
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Pending
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
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
        <button className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors whitespace-nowrap">
          Approve all (0)
        </button>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20">
        <Send className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">
          No outbound to approve
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Outbound messages waiting for approval will appear here.
        </p>
      </div>
    </div>
  );
}
