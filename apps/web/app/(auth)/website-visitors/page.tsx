"use client";

import { useState } from "react";
import { Globe, Search, SlidersHorizontal, User, Plus } from "lucide-react";

const tabs = ["People", "Companies"] as const;
type Tab = (typeof tabs)[number];

export default function WebsiteVisitorsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("People");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Website visitors</h1>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition">
          <Globe className="h-4 w-4" />
          Select domain
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mt-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-[#6C47FF] text-[#6C47FF]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="flex gap-6 mt-4 text-sm text-gray-500">
        <span>
          Identified today <span className="font-medium text-gray-900">0</span>
        </span>
        <span>
          Identified (7d) <span className="font-medium text-gray-900">0</span>
        </span>
        <span>
          Identified (30d) <span className="font-medium text-gray-900">0</span>
        </span>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search visitors..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-violet-500 transition"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20">
        {/* Stacked card illustrations */}
        <div className="relative h-24 w-32 mb-6">
          <div className="absolute top-0 left-0 flex h-16 w-28 items-center justify-center rounded-lg border-2 border-gray-200 bg-white opacity-30">
            <User className="h-6 w-6 text-gray-300" />
          </div>
          <div className="absolute top-[-5px] left-[5px] flex h-16 w-28 items-center justify-center rounded-lg border-2 border-gray-200 bg-white opacity-50">
            <User className="h-6 w-6 text-gray-300" />
          </div>
          <div className="absolute top-[-10px] left-[10px] flex h-16 w-28 items-center justify-center rounded-lg border-2 border-gray-200 bg-white opacity-70">
            <User className="h-6 w-6 text-gray-300" />
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900">
          Add your first domain to start tracking visitors
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Add a domain to identify visitors and enable automated outreach.
        </p>
        <button className="mt-6 flex items-center gap-2 rounded-lg bg-[#6C47FF] px-6 py-2.5 text-white hover:bg-[#5a38e0] transition">
          <Plus className="h-4 w-4" />
          Add domain
        </button>
      </div>
    </div>
  );
}
