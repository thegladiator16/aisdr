"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";

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

type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: Record<string, boolean>;
};

/* ------------------------------------------------------------------ */
/*  Toggle                                                             */
/* ------------------------------------------------------------------ */
function Toggle({
  enabled,
  disabled,
  onToggle,
}: {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
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
function NewRoleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (role: Role) => void;
}) {
  const [roleName, setRoleName] = useState("");
  const [checked, setChecked] = useState<Record<FeatureKey, boolean>>(
    Object.fromEntries(features.map((f) => [f.key, false])) as Record<
      FeatureKey,
      boolean
    >
  );
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!roleName.trim()) {
      toast.error("Please enter a role name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/team/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName.trim(), permissions: checked }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not create role");
        return;
      }
      toast.success("Role created");
      onCreated(json.data);
      onClose();
    } catch {
      toast.error("Could not create role");
    } finally {
      setCreating(false);
    }
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
              disabled={creating}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create"}
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/roles");
      if (!res.ok) {
        toast.error("Could not load roles");
        return;
      }
      const json = await res.json();
      setRoles(json.data ?? []);
    } catch {
      toast.error("Could not load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleToggle = async (role: Role, feature: FeatureKey) => {
    const key = `${role.id}:${feature}`;
    setBusyKey(key);

    const nextValue = !role.permissions[feature];
    // Optimistic-but-verified: update local state only after the request
    // confirms success, so a failed request doesn't show a fake "updated"
    // state (this exact bug class — unchecked fetch showing fake success —
    // was already found and fixed once this session in Leads bulk-delete).
    try {
      const res = await fetch(`/api/team/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: { [feature]: nextValue } }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not update permissions");
        return;
      }
      setRoles((prev) =>
        prev.map((r) => (r.id === role.id ? json.data : r))
      );
      toast.success("Permissions updated");
    } catch {
      toast.error("Could not update permissions");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) return;
    setBusyKey(`delete:${role.id}`);
    try {
      const res = await fetch(`/api/team/roles/${role.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        toast.error(json.error ?? "Could not delete role");
        return;
      }
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      toast.success("Role deleted");
    } catch {
      toast.error("Could not delete role");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Access controls</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage permissions and roles for your organization
        </p>
        <p className="text-xs text-gray-400 mt-1">
          These permissions are saved for reference across your roles. They
          don&apos;t yet restrict actions elsewhere in the app.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Feature
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    {role.name}
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        disabled={busyKey === `delete:${role.id}`}
                        title="Delete role"
                        className="text-gray-300 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
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
            {loading ? (
              <tr>
                <td
                  colSpan={roles.length + 2}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  Loading roles…
                </td>
              </tr>
            ) : (
              features.map(({ key, label }, idx) => (
                <tr
                  key={key}
                  className={
                    idx < features.length - 1 ? "border-b border-gray-100" : ""
                  }
                >
                  <td className="px-6 py-4 text-sm text-gray-700">{label}</td>
                  {roles.map((role) => (
                    <td key={role.id} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <Toggle
                          enabled={!!role.permissions[key]}
                          disabled={busyKey === `${role.id}:${key}`}
                          onToggle={() => handleToggle(role, key)}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-6 py-4" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Role Modal */}
      {showNewRoleModal && (
        <NewRoleModal
          onClose={() => setShowNewRoleModal(false)}
          onCreated={(role) => setRoles((prev) => [...prev, role])}
        />
      )}
    </div>
  );
}
