"use client";

import { useState } from "react";
import { Briefcase, User, Database, Sparkles, SlidersHorizontal } from "lucide-react";

const professionalSuggestions = [
  "B2B SaaS founders in India with 10-50 employees",
  "CTOs at funded Indian startups Series A+",
  "VP Sales at EdTech companies in Bangalore",
  "Founders of D2C brands doing B2B outreach",
];

const businessSuggestions = [
  "Coffee shops in Koramangala Bangalore",
  "CA firms in Mumbai with 10+ employees",
  "Export companies in Surat Gujarat",
  "IT companies in Noida with 50+ employees",
];

const tabConfig = [
  { id: "professionals", label: "Professionals", icon: Briefcase, enabled: true },
  { id: "local", label: "Local businesses", icon: User, enabled: true },
  { id: "crm", label: "Your CRM", icon: Database, enabled: false },
] as const;

type TabId = "professionals" | "local" | "crm";

export default function FindLeadsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("professionals");

  const suggestions =
    activeTab === "professionals" ? professionalSuggestions : businessSuggestions;
  const placeholder =
    activeTab === "professionals" ? "Jeff Bezos" : "Le Jolie MedSpa";

  return (
    <div className="flex flex-col items-center px-6 py-12">
      <h1 className="text-2xl font-bold text-center text-gray-900">
        Search over 250M professional leads
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                !tab.enabled
                  ? "border border-gray-200 text-gray-400 cursor-not-allowed"
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
        placeholder={placeholder}
        className="mt-8 w-full max-w-2xl rounded-xl border-2 border-gray-200 h-14 px-5 text-base outline-none focus:border-violet-500 transition"
      />

      {/* AI Suggestions */}
      <div className="mt-4 w-full max-w-2xl space-y-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
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
      <button className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
        <SlidersHorizontal className="h-4 w-4" />
        Search with filters
      </button>
    </div>
  );
}
