"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, User, Database, Sparkles, SlidersHorizontal } from "lucide-react";

// Real external lead-database search (250M professionals/local businesses)
// needs a paid third-party data provider (Apollo/ZoomInfo/Clearbit-style)
// that isn't connected here — so those two tabs stay honestly marked
// "Coming soon" rather than faking a search. What IS real and searchable
// right now is the leads already saved in this account ("Your CRM").
const crmSuggestions = [
  "Search by job title, e.g. CTO or Founder",
  "Search by company name",
  "Search by location, e.g. Bangalore",
  "Search by email domain",
];

const tabConfig = [
  { id: "crm", label: "Your CRM", icon: Database, enabled: true },
  { id: "professionals", label: "Professionals", icon: Briefcase, enabled: false },
  { id: "local", label: "Local businesses", icon: User, enabled: false },
] as const;

type TabId = "professionals" | "local" | "crm";

export default function FindLeadsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("crm");
  const [searchQuery, setSearchQuery] = useState("");

  const placeholder = "Search your saved leads by name, title, or company...";

  const goToResults = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/find-leads/results${params.toString() ? `?${params}` : ""}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") goToResults();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion.replace(/^Search by [a-z ]+, e\.g\.\s?/i, "").replace(/^Search by /i, ""));
  };

  return (
    <div className="flex flex-col items-center px-6 py-12">
      <h1 className="text-2xl font-bold text-center text-gray-900">
        Search your saved leads
      </h1>

      {/* Tabs */}
      <div className="flex gap-3 mt-8">
        {tabConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              disabled={!tab.enabled}
              title={!tab.enabled ? "Needs a connected external lead-data provider" : undefined}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                !tab.enabled
                  ? "border border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                  : isActive
                  ? "bg-violet-50 text-violet-700 border border-violet-200"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {!tab.enabled && (
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="mt-8 w-full max-w-2xl rounded-xl border-2 border-gray-200 h-14 px-5 text-base outline-none focus:border-violet-500 transition"
      />

      {/* Suggestions */}
      <div className="mt-4 w-full max-w-2xl space-y-2">
        {crmSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSuggestionClick(suggestion)}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-violet-50 cursor-pointer transition"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100">
              <Sparkles className="h-3 w-3 text-violet-600" />
            </div>
            <span className="text-sm text-gray-700">{suggestion}</span>
          </button>
        ))}
      </div>

      {/* Search with filters button */}
      <button
        onClick={goToResults}
        className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Search with filters
      </button>
    </div>
  );
}
