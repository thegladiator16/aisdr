"use client";

import { useState } from "react";
import { Phone } from "lucide-react";

const tabs = ["Ready to call", "Upcoming", "Call log"] as const;
type Tab = (typeof tabs)[number];

export default function DialerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Ready to call");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Dialer</h1>

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

      {/* Tab Content */}
      {activeTab === "Ready to call" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Phone className="h-8 w-8 text-gray-300" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">
            Buy a dialer seat
          </h2>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Arya gives reps live talking points and summaries of past
            interactions.
          </p>
          <button className="mt-6 rounded-lg bg-[#6C47FF] px-6 py-2.5 text-white hover:bg-[#5a38e0] transition">
            Buy dialer seats
          </button>
        </div>
      )}

      {activeTab === "Upcoming" && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-gray-500">No upcoming calls</p>
        </div>
      )}

      {activeTab === "Call log" && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-gray-500">No call history yet</p>
        </div>
      )}
    </div>
  );
}
