"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2, Route, Loader2, Shield, UserCheck, HelpCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

type FeatureKey =
  | "campaigns"
  | "manageArya"
  | "inboxTasks"
  | "integrations"
  | "userManagement"
  | "accessTeam"
  | "creditPurchasing"
  | "billing";

const features: { key: FeatureKey; label: string; tooltip: string }[] = [
  { key: "campaigns", label: "Campaigns", tooltip: "Create, edit, pause, and delete outreach campaigns" },
  { key: "manageArya", label: "Manage Arya", tooltip: "Configure Arya's outreach behavior, sequences, and guardrails" },
  { key: "inboxTasks", label: "Inbox & tasks", tooltip: "View and respond to lead replies, manage action items" },
  { key: "integrations", label: "Integrations", tooltip: "Connect and manage third-party integrations" },
  { key: "userManagement", label: "User management", tooltip: "Invite, remove, and manage team member roles" },
  { key: "accessTeam", label: "Access team members' tasks and inbox", tooltip: "View and act on other team members' inbox items and tasks" },
  { key: "creditPurchasing", label: "Credit purchasing", tooltip: "Purchase additional credits for the organization" },
  { key: "billing", label: "Billing", tooltip: "View invoices, update payment method, and manage subscription" },
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
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
/*  Lead Routing Rules                                                 */
/* ------------------------------------------------------------------ */
type MatchCriteria = {
  industry?: string;
  region?: string;
  seniority?: string;
  minCompanySize?: number;
  maxCompanySize?: number;
  jobTitleContains?: string;
};

type RoutingRule = {
  id: string;
  priority: number;
  matchCriteria: MatchCriteria;
  assignToTeamMemberId: string | null;
  assignToEmail: string | null;
  enabled: boolean;
  createdAt: string;
};

type TeamMemberLite = {
  id: string;
  email: string;
  status: string | null;
};

function criteriaSummary(c: MatchCriteria): string {
  const parts: string[] = [];
  if (c.industry) parts.push(`industry = ${c.industry}`);
  if (c.region) parts.push(`region = ${c.region}`);
  if (c.seniority) parts.push(`seniority = ${c.seniority}`);
  if (c.minCompanySize !== undefined)
    parts.push(`companySize ≥ ${c.minCompanySize}`);
  if (c.maxCompanySize !== undefined)
    parts.push(`companySize ≤ ${c.maxCompanySize}`);
  if (c.jobTitleContains)
    parts.push(`jobTitle contains "${c.jobTitleContains}"`);
  return parts.length === 0 ? "(matches every lead)" : parts.join(" · ");
}

function RuleModal({
  members,
  initial,
  onClose,
  onSaved,
}: {
  members: TeamMemberLite[];
  initial: RoutingRule | null;
  onClose: () => void;
  onSaved: (r: RoutingRule) => void;
}) {
  const [priority, setPriority] = useState(
    initial ? String(initial.priority) : "100"
  );
  const [industry, setIndustry] = useState(initial?.matchCriteria.industry ?? "");
  const [region, setRegion] = useState(initial?.matchCriteria.region ?? "");
  const [seniority, setSeniority] = useState(
    initial?.matchCriteria.seniority ?? ""
  );
  const [minSize, setMinSize] = useState(
    initial?.matchCriteria.minCompanySize !== undefined
      ? String(initial.matchCriteria.minCompanySize)
      : ""
  );
  const [maxSize, setMaxSize] = useState(
    initial?.matchCriteria.maxCompanySize !== undefined
      ? String(initial.matchCriteria.maxCompanySize)
      : ""
  );
  const [jobTitleContains, setJobTitleContains] = useState(
    initial?.matchCriteria.jobTitleContains ?? ""
  );
  const [assignTo, setAssignTo] = useState(
    initial?.assignToTeamMemberId ?? ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const priorityNum = Number(priority);
    if (!Number.isFinite(priorityNum) || priorityNum < 0) {
      toast.error("Priority must be a non-negative number");
      return;
    }
    const matchCriteria: Record<string, string | number> = {};
    if (industry.trim()) matchCriteria.industry = industry.trim();
    if (region.trim()) matchCriteria.region = region.trim();
    if (seniority.trim()) matchCriteria.seniority = seniority.trim();
    if (jobTitleContains.trim())
      matchCriteria.jobTitleContains = jobTitleContains.trim();
    if (minSize.trim()) {
      const n = Number(minSize);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Min company size must be a non-negative number");
        return;
      }
      matchCriteria.minCompanySize = n;
    }
    if (maxSize.trim()) {
      const n = Number(maxSize);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Max company size must be a non-negative number");
        return;
      }
      matchCriteria.maxCompanySize = n;
    }

    setSaving(true);
    try {
      const url = initial
        ? `/api/lead-routing/${initial.id}`
        : "/api/lead-routing";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: priorityNum,
          matchCriteria,
          assignToTeamMemberId: assignTo || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Could not save rule"
        );
        return;
      }
      onSaved(json.data);
      toast.success(initial ? "Rule updated" : "Rule created");
      onClose();
    } catch {
      toast.error("Could not save rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? "Edit routing rule" : "New routing rule"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <input
              type="number"
              min="0"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Lower runs first (ties broken by created-at).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. SaaS"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Region (country)
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. US"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Seniority
              </label>
              <input
                type="text"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                placeholder="e.g. VP"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Job title contains
              </label>
              <input
                type="text"
                value={jobTitleContains}
                onChange={(e) => setJobTitleContains(e.target.value)}
                placeholder="e.g. Sales"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Min company size
              </label>
              <input
                type="number"
                min="0"
                value={minSize}
                onChange={(e) => setMinSize(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max company size
              </label>
              <input
                type="number"
                min="0"
                value={maxSize}
                onChange={(e) => setMaxSize(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Assign to team member
            </label>
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">— unassigned (fall through) —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.email}
                  {m.status ? ` · ${m.status}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              Empty = matching leads skip this rule and fall through.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : initial ? "Save changes" : "Create rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadRoutingSection() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [members, setMembers] = useState<TeamMemberLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoutingRule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, membersRes] = await Promise.all([
        fetch("/api/lead-routing"),
        fetch("/api/team/members"),
      ]);
      if (!rulesRes.ok) {
        toast.error("Could not load routing rules");
        return;
      }
      const rulesJson = await rulesRes.json();
      setRules(rulesJson.data ?? []);
      if (membersRes.ok) {
        const mJson = await membersRes.json();
        setMembers(mJson.data ?? []);
      }
    } catch {
      toast.error("Could not load routing rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (rule: RoutingRule) => {
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/lead-routing/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) {
        toast.error("Could not update rule");
        return;
      }
      const json = await res.json();
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, enabled: json.data.enabled } : r
        )
      );
    } catch {
      toast.error("Could not update rule");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rule: RoutingRule) => {
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/lead-routing/${rule.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Could not delete rule");
        return;
      }
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success("Rule deleted");
    } catch {
      toast.error("Could not delete rule");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (r: RoutingRule) => {
    setRules((prev) => {
      const idx = prev.findIndex((x) => x.id === r.id);
      const next = idx === -1 ? [...prev, r] : prev.map((x) => (x.id === r.id ? r : x));
      // Preserve API's priority ASC / createdAt ASC order.
      return next.slice().sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Route className="h-4 w-4 text-violet-600" />
            Lead routing rules
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Assign incoming leads to team members based on industry, region,
            company size, and more. Rules run in priority order — first match
            wins.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6C47FF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5a3ad4] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New rule
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            Loading routing rules…
          </div>
        ) : rules.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No routing rules yet. Every incoming lead is currently unassigned.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-20">
                  Priority
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Criteria
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-56">
                  Assign to
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-24">
                  Enabled
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r, idx) => (
                <tr
                  key={r.id}
                  className={idx < rules.length - 1 ? "border-b border-gray-100" : ""}
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">
                    {r.priority}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <button
                      onClick={() => {
                        setEditing(r);
                        setShowModal(true);
                      }}
                      className="text-left hover:underline"
                    >
                      {criteriaSummary(r.matchCriteria)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 truncate">
                    {r.assignToEmail ?? (
                      <span className="text-gray-400 italic">unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Toggle
                      enabled={r.enabled}
                      disabled={busyId === r.id}
                      onToggle={() => handleToggle(r)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={busyId === r.id}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-50"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <RuleModal
          members={members}
          initial={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Access Controls Page                                               */
/* ------------------------------------------------------------------ */
export default function AccessControlsPage() {
  const router = useRouter();
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access controls</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage how different roles can access the features on AryaSDR.
          </p>
        </div>
        <button
          onClick={() => router.push("/settings/organization")}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 active:scale-[0.98] transition-all"
        >
          <UserPlus className="h-4 w-4" />
          Invite members
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Feature
              </th>
              {roles.map((role) => {
                const RoleIcon = role.name.toLowerCase() === "admin" ? Shield : UserCheck;
                return (
                  <th
                    key={role.id}
                    className="text-center text-xs font-medium text-gray-500 px-6 py-3"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <RoleIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span>{role.name}</span>
                      {!role.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          disabled={busyKey === `delete:${role.id}`}
                          title="Delete role"
                          className="text-gray-300 hover:text-red-500 disabled:opacity-50 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="text-center px-6 py-3">
                <button
                  onClick={() => setShowNewRoleModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100 hover:border-violet-400 transition-all"
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
              features.map(({ key, label, tooltip }, idx) => (
                <tr
                  key={key}
                  className={
                    idx < features.length - 1 ? "border-b border-gray-100" : ""
                  }
                >
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex items-center gap-1.5 group relative">
                      {label}
                      <span className="relative">
                        <HelpCircle className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 cursor-help" />
                        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-52 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white text-center shadow-lg z-30">
                          {tooltip}
                          <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
                        </span>
                      </span>
                    </div>
                  </td>
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

      {/* Lead routing rules — sits under the roles matrix because
          access-controls is the natural home for "who gets what
          incoming lead". */}
      <div className="pt-6 border-t border-gray-100">
        <LeadRoutingSection />
      </div>
    </div>
  );
}
