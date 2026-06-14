"use client";

import { useState } from "react";
import { Search, Inbox, MessageCircle, SlidersHorizontal } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Inbox Page                                                         */
/* ------------------------------------------------------------------ */

type Tab = "needs-action" | "no-action" | "sent";

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>("needs-action");
  const [search, setSearch] = useState("");

  const tabs: { id: Tab; label: string }[] = [
    { id: "needs-action", label: "Needs action" },
    { id: "no-action", label: "No action" },
    { id: "sent", label: "Sent" },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* ---- LEFT PANEL ---- */}
      <div className="w-[370px] flex flex-col border-r border-gray-200">
        {/* Tabs */}
        <div className="flex gap-4 px-4 pt-4 border-b border-gray-200">
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
            />
          </div>
          <div className="mt-3 mb-3">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Inbox className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Inbox zero... Feels good right?
          </p>
        </div>
      </div>

      {/* ---- RIGHT PANEL ---- */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <MessageCircle className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Select a chat to view</p>
      </div>
    </div>
  );
}
