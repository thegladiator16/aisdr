"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Copy, Check } from "lucide-react";

const ORG_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

export default function OrganizationPage() {
  const [orgName, setOrgName] = useState("AryaSDR's organization");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(orgName);

  const [domain, setDomain] = useState("");
  const [savedDomains, setSavedDomains] = useState<string[]>([]);

  const [copied, setCopied] = useState(false);

  const handleSaveName = () => {
    if (nameDraft.trim()) {
      setOrgName(nameDraft.trim());
      setEditingName(false);
      toast.success("Organization name updated");
    }
  };

  const handleAddDomain = () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }
    setSavedDomains((prev) => [...prev, domain.trim()]);
    setDomain("");
    toast.success("Domain added");
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(ORG_ID);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

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
                className="px-4 py-2 text-sm font-medium text-white bg-[#6C47FF] rounded-lg hover:bg-[#5a3ad4] transition-colors"
              >
                Save
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        {savedDomains.length > 0 && (
          <div className="mt-3 space-y-2">
            {savedDomains.map((d, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">https://{d}</span>
                <button
                  onClick={() => {
                    setSavedDomains((prev) => prev.filter((_, i) => i !== idx));
                    toast.success("Domain removed");
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organization ID */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Organization ID</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyId}
            className="flex items-center gap-2 text-sm text-gray-700 font-mono hover:text-violet-600 transition-colors group"
          >
            {ORG_ID}
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
