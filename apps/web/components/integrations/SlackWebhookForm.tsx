"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Hash, Loader2, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface Props {
  initialConnected: boolean;
  initialChannel?: string;
}

export default function SlackWebhookForm({ initialConnected, initialChannel }: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [channel, setChannel] = useState(initialChannel ?? "");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    const url = webhookUrl.trim();
    if (!url) {
      setError("Please enter your Slack webhook URL");
      return;
    }
    if (!url.startsWith("https://hooks.slack.com/")) {
      setError("URL must start with https://hooks.slack.com/");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/integrations/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url, channelName: channelName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to connect Slack");
        return;
      }
      setConnected(true);
      setChannel(channelName.trim() || data.channel || "");
      setWebhookUrl("");
      setChannelName("");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/slack", {
        method: "DELETE",
      });
      if (res.ok) {
        setConnected(false);
        setChannel("");
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleTestMessage() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/slack/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Test message failed");
      }
    } catch {
      setError("Test message failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
          <BrandLogo brand="slack" className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">Slack</h3>
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

      <p className="text-xs text-gray-500">
        Get real-time notifications in Slack when leads reply, meetings are booked, or Arya needs your attention.
      </p>

      {connected ? (
        <div className="space-y-3 mt-auto">
          {channel && (
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <Hash className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="truncate">Posting to #{channel}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleTestMessage}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Send test
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Disconnect
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => { setWebhookUrl(e.target.value); setError(null); }}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Channel name (optional, e.g. sales-alerts)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}

            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                How to get your webhook URL
              </summary>
              <ol className="mt-2 space-y-1.5 pl-4 list-decimal text-gray-500">
                <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">api.slack.com/apps</a></li>
                <li>Click &ldquo;Create New App&rdquo; &rarr; &ldquo;From scratch&rdquo;</li>
                <li>Name it &ldquo;AryaSDR&rdquo; and select your workspace</li>
                <li>Go to &ldquo;Incoming Webhooks&rdquo; &rarr; enable it</li>
                <li>Click &ldquo;Add New Webhook to Workspace&rdquo;</li>
                <li>Choose a channel and copy the webhook URL</li>
              </ol>
            </details>
          </div>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrandLogo brand="slack" className="h-4 w-4" />}
            Connect Slack
          </button>
        </>
      )}
    </div>
  );
}
