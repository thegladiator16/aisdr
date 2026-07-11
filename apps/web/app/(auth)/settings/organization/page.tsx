"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Copy, Check, Loader2 } from "lucide-react";

export default function OrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");

  const [orgName, setOrgName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [domain, setDomain] = useState("");
  const [savedDomains, setSavedDomains] = useState<string[]>([]);
  const [savingDomain, setSavingDomain] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        setAccountId(json.id ?? "");
        setOrgName(json.companyName || "AryaSDR's organization");
        setSavedDomains(json.companyDomains ?? []);
      })
      .catch(() => toast.error("Could not load organization details"))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (fields: Record<string, unknown>) => {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return res.ok;
  };

  const handleSaveName = async () => {
    if (!nameDraft.trim()) return;
    setSavingName(true);
    try {
      const ok = await persist({ companyName: nameDraft.trim() });
      if (!ok) {
        toast.error("Could not update organization name");
        return;
      }
      setOrgName(nameDraft.trim());
      setEditingName(false);
      toast.success("Organization name updated");
    } finally {
      setSavingName(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }
    const cleaned = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const next = [...savedDomains, cleaned];
    setSavingDomain(true);
    try {
      const ok = await persist({ companyDomains: next });
      if (!ok) {
        toast.error("Could not add domain");
        return;
      }
      setSavedDomains(next);
      setDomain("");
      toast.success("Domain added");
    } finally {
      setSavingDomain(false);
    }
  };

  const handleRemoveDomain = async (idx: number) => {
    const next = savedDomains.filter((_, i) => i !== idx);
    const ok = await persist({ companyDomains: next });
    if (!ok) {
      toast.error("Could not remove domain");
      return;
    }
    setSavedDomains(next);
    toast.success("Domain removed");
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your organization settings and details
        </p>
      </div>

      {/* Organization name */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {editingName ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500">Organization name</h2>
            <input
              autoFocus
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setNameDraft(orgName);
                  setEditingName(false);
                }
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-4 py-2 text-sm font-medium text-white bg-[#6C47FF] rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setNameDraft(orgName);
                  setEditingName(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-500">Organization name</h2>
              <p className="text-base font-semibold text-gray-900 mt-1">{orgName}</p>
            </div>
            <button
              onClick={() => {
                setNameDraft(orgName);
                setEditingName(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Domain */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Domain</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center flex-1">
            <span className="px-3 py-2 bg-gray-100 text-sm text-gray-500 border border-r-0 border-gray-200 rounded-l-lg">
              https://
            </span>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddDomain();
              }}
              placeholder="example.com"
              className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleAddDomain}
            disabled={savingDomain}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        {savedDomains.length > 0 && (
          <div className="mt-3 space-y-2">
            {savedDomains.map((d, idx) => (
              <div key={d} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">https://{d}</span>
                <button
                  onClick={() => handleRemoveDomain(idx)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account ID */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Account ID</h2>
        <p className="text-xs text-gray-400 mb-2">
          Reference this ID when contacting support
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyId}
            className="flex items-center gap-2 text-sm text-gray-700 font-mono hover:text-violet-600 transition-colors group"
          >
            {accountId}
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400 group-hover:text-violet-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
