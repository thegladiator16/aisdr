"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface Props {
  initialConnected: boolean;
  initialAccountSid?: string;
}

export default function TwilioForm({ initialConnected, initialAccountSid }: Props) {
  const [connected, setConnected] = useState(initialConnected);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!accountSid.trim() || !authToken.trim()) {
      setError("Account SID and Auth Token are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/integrations/twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSid: accountSid.trim(),
          authToken: authToken.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to connect Twilio");
        return;
      }
      setConnected(true);
      setAccountSid("");
      setAuthToken("");
      setPhoneNumber("");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/twilio", { method: "DELETE" });
      if (res.ok) setConnected(false);
    } catch {} finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
          <BrandLogo brand="twilio" className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">Twilio</h3>
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
        Send WhatsApp messages, SMS, and make voice calls via Twilio APIs.
      </p>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700 border border-green-200">
          WhatsApp
        </span>
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 border border-blue-200">
          SMS
        </span>
        <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs text-violet-700 border border-violet-200">
          Voice
        </span>
      </div>

      {connected ? (
        <div className="space-y-3 mt-auto">
          {initialAccountSid && (
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <span className="truncate">SID: {initialAccountSid.slice(0, 8)}...{initialAccountSid.slice(-4)}</span>
            </div>
          )}
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
              type="text"
              value={accountSid}
              onChange={(e) => { setAccountSid(e.target.value); setError(null); }}
              placeholder="Account SID (ACxxxxxxxxx)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <input
              type="password"
              value={authToken}
              onChange={(e) => { setAuthToken(e.target.value); setError(null); }}
              placeholder="Auth Token"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Twilio phone number (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}

            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Where to find your Twilio credentials
              </summary>
              <ol className="mt-2 space-y-1.5 pl-4 list-decimal text-gray-500">
                <li>Log in to your <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Twilio Console</a></li>
                <li>Your Account SID and Auth Token are on the dashboard</li>
                <li>For SMS/WhatsApp, you also need a Twilio phone number</li>
              </ol>
            </details>
          </div>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrandLogo brand="twilio" className="h-4 w-4" />}
            Connect Twilio
          </button>
        </>
      )}
    </div>
  );
}
