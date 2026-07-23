"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Trash2, X, AlertTriangle } from "lucide-react";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
};

type CreatedKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  key: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy, copy manually from the field.");
  }
}

export default function ApiKeysPage() {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Grab the current window origin at mount so we can render the
  // documentation snippet with a real absolute URL rather than a
  // hard-coded aryasdr.in that would be wrong in local dev / preview.
  const [origin, setOrigin] = useState("https://aryasdr.in");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const loadRows = async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error("Failed to load API keys");
      const json = await res.json();
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch {
      toast.error("Could not load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      toast.error("Give the key a name so you can identify it later.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      const json = await res.json();
      const created = json?.data as CreatedKey | undefined;
      if (!created?.key) throw new Error("Malformed response");
      setCreatedKey(created);
      setShowCreate(false);
      setCreateName("");
      toast.success("API key created");
      // Refresh the underlying list so the new (redacted) row shows up.
      loadRows();
    } catch {
      toast.error("Could not create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    // No native confirm() prompt — the button is in a table row, and a
    // deleted key is unrecoverable, so a lightweight in-line confirm is
    // more honest than a blocking browser dialog.
    if (
      !window.confirm(
        "Delete this API key? Any external system using it will stop working immediately."
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete API key");
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("API key deleted");
    } catch {
      toast.error("Could not delete API key");
    } finally {
      setDeletingId(null);
    }
  };

  const webhookUrl = createdKey
    ? `${origin}/api/hooks/lead/${createdKey.keyPrefix}?key=${createdKey.key}`
    : `${origin}/api/hooks/lead/<your-key-prefix>?key=<full-key>`;

  const exampleBody = `{
  "email": "jane@acme.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "companyName": "Acme Inc",
  "jobTitle": "Head of Growth"
}`;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            Push new leads into AryaSDR from Zapier, forms, or your CRM using
            an inbound webhook authenticated by an API key.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6C47FF] text-white text-sm font-medium hover:bg-[#5b3ce8] transition-colors"
        >
          <KeyRound className="h-4 w-4" />
          Create key
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto] items-center px-6 py-3 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <span>Name</span>
          <span>Prefix</span>
          <span>Last used</span>
          <span>Created</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            Loading API keys…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            You haven't created any API keys yet.
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row.id}
              className={`grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto] items-center px-6 py-4 ${
                idx < rows.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <div className="text-sm font-medium text-gray-800 truncate pr-4">
                {row.name}
                {row.disabledAt && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                    Disabled
                  </span>
                )}
              </div>
              <code className="text-xs text-gray-700 font-mono truncate pr-4">
                {row.keyPrefix}…
              </code>
              <span className="text-xs text-gray-500">
                {formatDate(row.lastUsedAt)}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(row.createdAt)}
              </span>
              <div className="flex justify-end">
                <button
                  onClick={() => handleDelete(row.id)}
                  disabled={deletingId === row.id}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === row.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Docs snippet */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Inbound webhook
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            POST a JSON body to this URL to create a new lead. Send the key in
            the <code className="font-mono">x-arya-key</code> header, or on the
            <code className="font-mono"> ?key=</code> query string as shown
            here.
          </p>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Endpoint
          </div>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
            POST {webhookUrl}
          </pre>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Example body
          </div>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
            {exampleBody}
          </pre>
        </div>
      </div>

      {/* Create-key modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Create API key
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  You'll see the full key exactly once, copy it before closing
                  the dialog.
                </p>
              </div>
              <button
                onClick={() => !creating && setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Zapier: inbound webform"
                autoFocus
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-[#6C47FF] text-white text-sm font-medium hover:bg-[#5b3ce8] disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created-key reveal modal (plaintext shown once) */}
      {createdKey && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  API key created
                </h3>
                <p className="text-xs text-gray-500 mt-1">{createdKey.name}</p>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                This is the only time you'll see this key, copy it now. If
                you lose it, you'll need to create a new one.
              </p>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Your key
              </div>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 bg-gray-900 text-gray-100 rounded-lg p-3 text-xs font-mono break-all">
                  {createdKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey.key)}
                  className="inline-flex items-center gap-1 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCreatedKey(null)}
                className="px-4 py-2 rounded-lg bg-[#6C47FF] text-white text-sm font-medium hover:bg-[#5b3ce8]"
              >
                I've saved it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
