"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Mail, Key, User } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface GmailSmtpFormProps {
  initialConnected: boolean;
  initialEmail?: string;
  initialName?: string;
  emailsSentToday?: number;
  dailyEmailLimit?: number | null;
  status?: string;
}

export default function GmailSmtpForm({
  initialConnected,
  initialEmail,
  initialName,
  emailsSentToday = 0,
  dailyEmailLimit,
  status,
}: GmailSmtpFormProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [accountEmail, setAccountEmail] = useState(initialEmail ?? "");
  const [accountName, setAccountName] = useState(initialName ?? "");
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/v1/integrations/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Connection failed");
        return;
      }

      setConnected(true);
      setAccountEmail(data.email);
      setAccountName(name.trim() || email.split("@")[0]);
      setShowForm(false);
      setSuccess("Gmail connected successfully!");
      setPassword("");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Gmail? Outreach emails won't be sent until you reconnect.")) return;
    setLoading(true);

    try {
      await fetch("/api/v1/integrations/gmail", { method: "DELETE" });
      setConnected(false);
      setAccountEmail("");
      setAccountName("");
      setSuccess("");
    } catch {
      setError("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  }

  if (connected && !showForm) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
            <BrandLogo brand="gmail" className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900">Gmail</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{accountEmail}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Send emails from your Gmail account via SMTP. Replies sync automatically.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">{emailsSentToday}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-sm font-bold text-gray-900">{dailyEmailLimit ?? "—"}</p>
            <p className="text-xs text-gray-500">Limit</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {status === "active" ? "✓" : "!"}
            </p>
            <p className="text-xs text-gray-500">Status</p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="mt-1 text-xs text-red-500 hover:text-red-700 transition-colors self-start"
        >
          {loading ? "Disconnecting..." : "Disconnect"}
        </button>

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {success}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
          <BrandLogo brand="gmail" className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Gmail</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Connect with App Password (SMTP)
          </p>
        </div>
      </div>

      {!showForm ? (
        <>
          <p className="text-xs text-gray-500">
            Send emails from your Gmail account via SMTP. Replies sync automatically.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-auto inline-flex items-center justify-center rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all duration-150"
          >
            Connect Gmail
          </button>
        </>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Mail className="h-3 w-3 inline mr-1" />
              Gmail Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Key className="h-3 w-3 inline mr-1" />
              App Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono tracking-wider focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
            />
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-xs text-[#6C47FF] hover:underline"
            >
              Create an App Password
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <User className="h-3 w-3 inline mr-1" />
              Sender Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Connect"
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1.5">
            <p className="text-xs font-medium text-blue-800">How to create an App Password:</p>
            <ol className="text-xs text-blue-700 list-decimal list-inside space-y-0.5">
              <li>Enable 2-Step Verification on your Google Account</li>
              <li>
                Go to{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  myaccount.google.com/apppasswords
                </a>
              </li>
              <li>Enter &quot;AryaSDR&quot; as the app name</li>
              <li>Copy the 16-character password and paste it above</li>
            </ol>
          </div>
        </form>
      )}
    </div>
  );
}
