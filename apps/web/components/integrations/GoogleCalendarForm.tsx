"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Link2, Loader2, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface Props {
  initialConnected: boolean;
  initialCalendarUrl?: string;
}

export default function GoogleCalendarForm({ initialConnected, initialCalendarUrl }: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [calendarUrl, setCalendarUrl] = useState(initialCalendarUrl ?? "");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    const url = inputUrl.trim();
    if (!url) {
      setError("Please enter your Google Calendar iCal URL");
      return;
    }
    if (!url.includes("calendar.google.com") && !url.startsWith("https://")) {
      setError("Please enter a valid Google Calendar URL");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/integrations/google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to connect Google Calendar");
        return;
      }
      setConnected(true);
      setCalendarUrl(url);
      setInputUrl("");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/google-calendar", {
        method: "DELETE",
      });
      if (res.ok) {
        setConnected(false);
        setCalendarUrl("");
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
          <BrandLogo brand="google-calendar" className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">Google Calendar</h3>
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
        Sync your calendar to detect meetings booked by leads and avoid scheduling conflicts.
      </p>

      {connected ? (
        <div className="space-y-3 mt-auto">
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <Link2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="truncate">Calendar connected</span>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => { setInputUrl(e.target.value); setError(null); }}
              placeholder="Paste your iCal URL here"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}

            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                How to get your iCal URL
              </summary>
              <ol className="mt-2 space-y-1.5 pl-4 list-decimal text-gray-500">
                <li>Open <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Google Calendar Settings</a></li>
                <li>Click your calendar under &ldquo;Settings for my calendars&rdquo;</li>
                <li>Scroll to &ldquo;Integrate calendar&rdquo;</li>
                <li>Copy the &ldquo;Secret address in iCal format&rdquo; URL</li>
                <li>Paste it above</li>
              </ol>
            </details>
          </div>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Connect Calendar
          </button>
        </>
      )}
    </div>
  );
}
