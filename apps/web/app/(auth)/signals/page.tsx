"use client";

import { useState } from "react";
import {
  DollarSign,
  Trophy,
  UserPlus,
  MapPin,
  Layers,
  Grid3X3,
  Building2,
  Webhook,
  Users,
  Rocket,
  X,
} from "lucide-react";

type FilterTab = "All" | "Hiring" | "Funding" | "Other";

interface Signal {
  id: number;
  icon: React.ElementType;
  iconBg: string;
  title: string;
  description: string;
  comingSoon: boolean;
  categories: FilterTab[];
}

const signals: Signal[] = [
  {
    id: 1,
    icon: DollarSign,
    iconBg: "bg-green-100",
    title: "Funding announcement",
    description:
      "Find leads at companies that recently raised a new funding round.",
    comingSoon: false,
    categories: ["Funding"],
  },
  {
    id: 2,
    icon: Trophy,
    iconBg: "bg-blue-100",
    title: "New leadership hire",
    description:
      "Find leads at companies that recently hired a senior leader.",
    comingSoon: false,
    categories: ["Hiring"],
  },
  {
    id: 3,
    icon: UserPlus,
    iconBg: "bg-pink-100",
    title: "First hire in department",
    description:
      "Find leads at companies making their first hire in a department.",
    comingSoon: false,
    categories: ["Hiring"],
  },
  {
    id: 4,
    icon: UserPlus,
    iconBg: "bg-orange-100",
    title: "First hire in role",
    description:
      "Find leads at companies creating a new specialized role.",
    comingSoon: false,
    categories: ["Hiring"],
  },
  {
    id: 5,
    icon: MapPin,
    iconBg: "bg-red-100",
    title: "Actively hiring for role",
    description:
      "Find leads from companies that are actively hiring for matching roles.",
    comingSoon: false,
    categories: ["Hiring"],
  },
  {
    id: 6,
    icon: Layers,
    iconBg: "bg-gray-100",
    title: "Hiring for tech stack",
    description:
      "Find companies using specific tools or technologies based on active job descriptions.",
    comingSoon: true,
    categories: ["Hiring"],
  },
  {
    id: 7,
    icon: Grid3X3,
    iconBg: "bg-gray-100",
    title: "Topic intent",
    description:
      "Detect when a company researches topics relevant to your product.",
    comingSoon: true,
    categories: ["Other"],
  },
  {
    id: 8,
    icon: Trophy,
    iconBg: "bg-gray-100",
    title: "Named investor backing",
    description:
      "Detect when a company receives investments from specific investors you track.",
    comingSoon: true,
    categories: ["Funding"],
  },
  {
    id: 9,
    icon: Building2,
    iconBg: "bg-gray-100",
    title: "Top customer's investors",
    description:
      "Detect companies backed by the same investors as your best customers.",
    comingSoon: true,
    categories: ["Funding"],
  },
  {
    id: 10,
    icon: Webhook,
    iconBg: "bg-gray-100",
    title: "Webhook",
    description:
      "Trigger outreach from any external system via webhook.",
    comingSoon: true,
    categories: ["Other"],
  },
  {
    id: 11,
    icon: UserPlus,
    iconBg: "bg-gray-100",
    title: "First hire in country",
    description:
      "Detect when a company makes their first hire in a new geography.",
    comingSoon: true,
    categories: ["Hiring"],
  },
  {
    id: 12,
    icon: Users,
    iconBg: "bg-gray-100",
    title: "Multiple open jobs",
    description:
      "Detect companies with high hiring volume in a single department.",
    comingSoon: true,
    categories: ["Hiring"],
  },
];

const filterTabs: FilterTab[] = ["All", "Hiring", "Funding", "Other"];

const campaignOptions = [
  "Q2 Fintech Outreach",
  "SaaS Founders - April Batch",
];

export default function SignalsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [signalModalOpen, setSignalModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const filteredSignals =
    activeFilter === "All"
      ? signals
      : signals.filter((s) => s.categories.includes(activeFilter));

  const handleSignalClick = (signal: Signal) => {
    if (signal.comingSoon) return;
    setSelectedSignal(signal);
    setSelectedCampaign("");
    setSignalModalOpen(true);
  };

  const handleSetupSignal = () => {
    setSignalModalOpen(false);
    setSelectedSignal(null);
    setSelectedCampaign("");
    setToast("Signal configured!");
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <div className="px-6 pt-8 pb-12">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Find new leads with intent signals
        </h1>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 mt-6">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeFilter === tab
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Signal Cards Grid */}
        <div className="grid grid-cols-3 gap-4 max-w-5xl mx-auto mt-8">
          {filteredSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.id}
                onClick={() => handleSignalClick(signal)}
                title={signal.comingSoon ? "Coming soon — join waitlist" : undefined}
                className={`relative rounded-xl border border-gray-200 bg-white p-5 transition ${
                  signal.comingSoon
                    ? "opacity-60 cursor-default"
                    : "hover:shadow-md cursor-pointer"
                }`}
              >
                {signal.comingSoon && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                    <Rocket className="h-3 w-3" />
                    Coming soon
                  </span>
                )}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${signal.iconBg}`}
                >
                  <Icon className="h-5 w-5 text-gray-700" />
                </div>
                <h3 className="mt-3 font-medium text-gray-900">
                  {signal.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signal Setup Modal */}
      {signalModalOpen && selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Set up {selectedSignal.title}
              </h2>
              <button
                onClick={() => {
                  setSignalModalOpen(false);
                  setSelectedSignal(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">{selectedSignal.description}</p>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Campaign to enroll leads
                </label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                >
                  <option value="">Select a campaign...</option>
                  {campaignOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__new">+ Create new campaign</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => {
                  setSignalModalOpen(false);
                  setSelectedSignal(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSetupSignal}
                className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition"
              >
                Set up signal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
