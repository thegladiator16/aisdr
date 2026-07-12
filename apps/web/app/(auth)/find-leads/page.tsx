"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Store, Database, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const AI_SUGGESTIONS = [
  "COOs and Supply Chain VPs driving efficiency in manufacturing and logistics enterprises.",
  "CTOs and CIOs implementing AI and automation platforms in industrial enterprises.",
  "Operations and planning managers optimizing workflows in industrial and logistics firms.",
  "IT, engineering, and systems integration leaders across the industrial sector.",
];

const TABS = [
  { id: "professionals", label: "Professionals", icon: Briefcase, enabled: true },
  { id: "local", label: "Local businesses", icon: Store, enabled: true },
  { id: "crm", label: "Your CRM", icon: Database, enabled: true, badge: "Coming soon" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function FindLeadsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("professionals");
  const [searchQuery, setSearchQuery] = useState("");

  const goToResults = (query?: string) => {
    const params = new URLSearchParams();
    const q = query ?? searchQuery;
    if (q.trim()) params.set("q", q.trim());
    router.push(`/find-leads/results${params.toString() ? `?${params}` : ""}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") goToResults();
  };

  return (
    <div className="flex flex-col items-center px-6 py-16 min-h-full">
      {/* Headline */}
      <h1 className="text-3xl font-bold text-center text-gray-900 tracking-tight">
        Search over <span className="text-violet-600">250M</span> professional leads
      </h1>

      {/* Tabs */}
      <div className="mt-10 flex rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const disabled = ("badge" in tab) && tab.badge === "Coming soon";
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition border-r last:border-r-0 border-gray-200",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : disabled
                  ? "text-gray-400 cursor-default"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {"badge" in tab && tab.badge && (
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search box */}
      <div className="mt-8 w-full max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeTab === "professionals"
                ? "e.g. VP of Sales at Series B SaaS companies in the US"
                : activeTab === "local"
                ? "e.g. restaurants in Mumbai with 50+ employees"
                : "Search your saved leads..."
            }
            className="w-full rounded-xl border-2 border-gray-200 h-14 pl-12 pr-4 text-base outline-none focus:border-violet-500 transition shadow-sm bg-white"
          />
        </div>
      </div>

      {/* AI Suggestions */}
      {activeTab === "professionals" && (
        <div className="mt-4 w-full max-w-2xl space-y-2">
          {AI_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => goToResults(suggestion)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-violet-300 hover:bg-violet-50/50 transition group shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 group-hover:bg-violet-200 transition">
                <Search className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <span className="text-sm text-gray-700">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === "local" && (
        <div className="mt-4 w-full max-w-2xl space-y-2">
          {[
            "Hair salons in Bangalore with 10+ staff",
            "Restaurants in Mumbai open for franchise",
            "Real estate agencies in Delhi NCR",
            "Gyms and fitness centers in Pune",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => goToResults(suggestion)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-violet-300 hover:bg-violet-50/50 transition group shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 group-hover:bg-violet-200 transition">
                <Search className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <span className="text-sm text-gray-700">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === "crm" && (
        <div className="mt-4 w-full max-w-2xl space-y-2">
          {[
            "Search by job title, e.g. CTO or Founder",
            "Search by company name",
            "Search by location, e.g. Bangalore",
            "Search by email domain",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => goToResults(suggestion)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-violet-300 hover:bg-violet-50/50 transition group shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 group-hover:bg-violet-200 transition">
                <Search className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <span className="text-sm text-gray-700">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search with filters button */}
      <button
        onClick={() => goToResults()}
        className="mt-6 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition shadow-sm"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Search with filters
      </button>
    </div>
  );
}
