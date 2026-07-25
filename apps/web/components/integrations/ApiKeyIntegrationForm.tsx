"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { BrandLogo, type BrandLogoName } from "@/components/brand/BrandLogo";

interface Props {
  type: string;
  label: string;
  description: string;
  brand: BrandLogoName;
  initialConnected: boolean;
  placeholder?: string;
  helpUrl?: string;
  helpLabel?: string;
}

export default function ApiKeyIntegrationForm({
  type,
  label,
  description,
  brand,
  initialConnected,
  placeholder,
  helpUrl,
  helpLabel,
}: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/integrations/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Failed to connect ${label}`);
        return;
      }
      setConnected(true);
      setApiKey("");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/integrations/api-key?type=${type}`, {
        method: "DELETE",
      });
      if (res.ok) setConnected(false);
    } catch {} finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
          <BrandLogo brand={brand} className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                Not connected
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">{description}</p>

      {connected ? (
        <div className="space-y-3 mt-auto">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Disconnect
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setError(null); }}
              placeholder={placeholder ?? "Paste your API key"}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}

            {helpUrl && (
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {helpLabel ?? "How to get your API key"}
              </a>
            )}
          </div>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrandLogo brand={brand} className="h-4 w-4" />}
            Connect {label.split(" (")[0]}
          </button>
        </>
      )}
    </div>
  );
}
