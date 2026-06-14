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

export default function SignalsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");

  const filteredSignals =
    activeFilter === "All"
      ? signals
      : signals.filter((s) => s.categories.includes(activeFilter));

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
                className={`relative rounded-xl border border-gray-200 bg-white p-5 transition ${
                  signal.comingSoon
                    ? "opacity-60"
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
    </div>
  );
}
