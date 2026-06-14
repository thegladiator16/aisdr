"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

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

/* ------------------------------------------------------------------ */
/*  Toggle                                                             */
/* ------------------------------------------------------------------ */
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
        enabled ? "bg-violet-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  New Role Modal                                                     */
/* ------------------------------------------------------------------ */
function NewRoleModal({ onClose }: { onClose: () => void }) {
  const [roleName, setRoleName] = useState("");
  const [checked, setChecked] = useState<Record<FeatureKey, boolean>>(
    Object.fromEntries(features.map((f) => [f.key, false])) as Record<FeatureKey, boolean>
  );

  const handleCreate = () => {
    if (!roleName.trim()) {
      toast.error("Please enter a role name");
      return;
    }
    toast.success("Role created");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Create new role</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role name</label>
            <input
              autoFocus
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Manager"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Feature permissions</p>
            <div className="space-y-2">
              {features.map((f) => (
                <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked[f.key]}
                    onChange={() =>
                      setChecked((prev) => ({ ...prev, [f.key]: !prev[f.key] }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-700">{f.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Access Controls Page                                               */
/* ------------------------------------------------------------------ */
export default function AccessControlsPage() {
  const [toggles, setToggles] = useState(defaultToggles);
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);

  const handleToggle = (role: string, feature: FeatureKey) => {
    setToggles((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !prev[role][feature],
      },
    }));
    toast.success("Permissions updated");
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
                <button
                  onClick={() => setShowNewRoleModal(true)}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 mx-auto"
                >
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

      {/* New Role Modal */}
      {showNewRoleModal && <NewRoleModal onClose={() => setShowNewRoleModal(false)} />}
    </div>
  );
}
