"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

type FeatureKey =
  | "campaigns"
  | "manageArya"
  | "inboxTasks"
  | "integrations"
  | "userManagement"
  | "accessTeam"
  | "creditPurchasing"
  | "billing";

const features: { key: FeatureKey; label: string }[] = [
  { key: "campaigns", label: "Campaigns" },
  { key: "manageArya", label: "Manage Arya" },
  { key: "inboxTasks", label: "Inbox & tasks" },
  { key: "integrations", label: "Integrations" },
  { key: "userManagement", label: "User management" },
  { key: "accessTeam", label: "Access team members' tasks and inbox" },
  { key: "creditPurchasing", label: "Credit purchasing" },
  { key: "billing", label: "Billing" },
];

const defaultToggles: Record<string, Record<FeatureKey, boolean>> = {
  admin: {
    campaigns: true,
    manageArya: true,
    inboxTasks: true,
    integrations: true,
    userManagement: true,
    accessTeam: true,
    creditPurchasing: true,
    billing: true,
  },
  member: {
    campaigns: true,
    manageArya: true,
    inboxTasks: true,
    integrations: false,
    userManagement: false,
    accessTeam: false,
    creditPurchasing: false,
    billing: false,
  },
};

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? "bg-[#6C47FF]" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export default function AccessControlsPage() {
  const [toggles, setToggles] = useState(defaultToggles);

  const handleToggle = (role: string, feature: FeatureKey) => {
    setToggles((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !prev[role][feature],
      },
    }));
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Access controls</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage permissions and roles for your organization
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Feature
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Admin
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Member
              </th>
              <th className="text-center px-6 py-3">
                <button className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 mx-auto">
                  <Plus className="h-3.5 w-3.5" />
                  New role
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map(({ key, label }, idx) => (
              <tr
                key={key}
                className={idx < features.length - 1 ? "border-b border-gray-100" : ""}
              >
                <td className="px-6 py-4 text-sm text-gray-700">{label}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      enabled={toggles.admin[key]}
                      onToggle={() => handleToggle("admin", key)}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      enabled={toggles.member[key]}
                      onToggle={() => handleToggle("member", key)}
                    />
                  </div>
                </td>
                <td className="px-6 py-4" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
