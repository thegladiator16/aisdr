"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Audience = "dont_notify" | "assigned_user" | "admin" | "all_members";
type Frequency = "realtime" | "daily" | "weekly";

const AUDIENCE_LABELS: Record<Audience, string> = {
  dont_notify: "Don't notify",
  assigned_user: "Assigned user",
  admin: "Admin",
  all_members: "All members",
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  realtime: "Real-time",
  daily: "Daily",
  weekly: "Weekly",
};

interface NotificationRow {
  id: string;
  label: string;
  description: string;
  timing: string;
  timingStyle: "violet" | "gray";
  defaultAudience: Audience;
  hasFrequency?: boolean;
  defaultFrequency?: Frequency;
}

const ROWS: NotificationRow[] = [
  {
    id: "urgent",
    label: "Urgent alerts",
    description: "Credits exhausted, account suspended, integration disconnected, blockers.",
    timing: "Real-time",
    timingStyle: "violet",
    defaultAudience: "all_members",
  },
  {
    id: "billing",
    label: "Billing and access",
    description: "Receipts, plan change confirmations, and access requests.",
    timing: "Real-time",
    timingStyle: "violet",
    defaultAudience: "admin",
  },
  {
    id: "replies",
    label: "Message reply alerts",
    description: "When a lead responds to a message from your workspace.",
    timing: "Real-time",
    timingStyle: "violet",
    defaultAudience: "all_members",
  },
  {
    id: "escalated",
    label: "Escalated replies",
    description: "When Arya needs your input on an autonomous response.",
    timing: "Real-time",
    timingStyle: "violet",
    defaultAudience: "all_members",
  },
  {
    id: "bounced",
    label: "Bounced and spam alerts",
    description: "When an outbound email bounces or is flagged as spam.",
    timing: "Real-time",
    timingStyle: "violet",
    defaultAudience: "dont_notify",
  },
  {
    id: "meetings",
    label: "Meeting booked alerts",
    description: "When Arya detects a meeting booked by a lead. Requires primary mailbox and calendar connection.",
    timing: "Real-time",
    timingStyle: "violet",
    defaultAudience: "assigned_user",
  },
  {
    id: "visitors",
    label: "Website visitor alerts",
    description: "When a known lead visits your website.",
    timing: "Every visitor",
    timingStyle: "violet",
    defaultAudience: "dont_notify",
  },
  {
    id: "overdue",
    label: "Overdue tasks",
    description: "Reminders when approvals, call tasks, or other action items are past due.",
    timing: "Real-time",
    timingStyle: "violet",
    defaultAudience: "assigned_user",
    hasFrequency: true,
    defaultFrequency: "daily",
  },
];

const DB_BACKED_TYPES = new Set(["urgent", "billing", "replies", "escalated"]);

function Dropdown({
  value,
  options,
  labels,
  onChange,
  disabled,
}: {
  value: string;
  options: string[];
  labels: Record<string, string>;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-between"
      >
        <span className="truncate">{labels[value] ?? value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors ${
                opt === value ? "text-violet-700 bg-violet-50/50 font-medium" : "text-gray-700"
              }`}
            >
              {labels[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();

  const [prefs, setPrefs] = useState<Record<string, { audience: Audience; frequency?: Frequency }>>(() => {
    const initial: Record<string, { audience: Audience; frequency?: Frequency }> = {};
    for (const row of ROWS) {
      initial[row.id] = {
        audience: row.defaultAudience,
        frequency: row.defaultFrequency,
      };
    }
    return initial;
  });

  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await fetch("/api/user/notifications");
        if (res.ok) {
          const json = await res.json();
          const dbData = json.data as Record<string, { emailEnabled: boolean }> | undefined;
          if (dbData) {
            setPrefs((prev) => {
              const updated = { ...prev };
              for (const [type, config] of Object.entries(dbData)) {
                if (updated[type]) {
                  updated[type] = {
                    ...updated[type],
                    audience: config.emailEnabled ? (updated[type].audience === "dont_notify" ? "all_members" : updated[type].audience) : "dont_notify",
                  };
                }
              }
              return updated;
            });
          }
        }
      } catch {}

      const saved = localStorage.getItem("aryasdr-notification-prefs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPrefs((prev) => {
            const updated = { ...prev };
            for (const [id, config] of Object.entries(parsed)) {
              if (updated[id] && !DB_BACKED_TYPES.has(id)) {
                updated[id] = config as { audience: Audience; frequency?: Frequency };
              }
            }
            return updated;
          });
        } catch {}
      }
    }
    loadPrefs();
  }, []);

  const updatePref = useCallback(async (id: string, key: "audience" | "frequency", value: string) => {
    setPrefs((prev) => {
      const updated = { ...prev, [id]: { ...prev[id], [key]: value } };
      localStorage.setItem("aryasdr-notification-prefs", JSON.stringify(updated));
      return updated;
    });

    if (DB_BACKED_TYPES.has(id) && key === "audience") {
      setSaving(id);
      try {
        await fetch("/api/user/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notificationType: id,
            emailEnabled: value !== "dont_notify",
          }),
        });
      } catch {} finally {
        setSaving(null);
      }
    }
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose how and when Arya reaches you.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Notification type
          </span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 w-[140px] justify-center">
            <Mail className="h-3.5 w-3.5" />
            Email
          </span>
          <button
            type="button"
            onClick={() => router.push("/settings/integrations")}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1 w-[140px] justify-center"
          >
            <BrandLogo brand="slack" className="h-3.5 w-3.5" />
            Integrate Slack
            <ExternalLink className="h-3 w-3" />
          </button>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px] text-center">
            Frequency
          </span>
        </div>

        {/* Rows */}
        {ROWS.map((row, idx) => (
          <div
            key={row.id}
            className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4 ${
              idx < ROWS.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            {/* Label + timing badge + description */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                  {row.label}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    row.timingStyle === "violet"
                      ? "bg-violet-50 text-violet-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {row.timing}
                </span>
                {saving === row.id && (
                  <span className="text-xs text-gray-400">Saving…</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
            </div>

            {/* Audience dropdown */}
            <div className="w-[140px]">
              <Dropdown
                value={prefs[row.id]?.audience ?? row.defaultAudience}
                options={Object.keys(AUDIENCE_LABELS)}
                labels={AUDIENCE_LABELS}
                onChange={(v) => updatePref(row.id, "audience", v)}
              />
            </div>

            {/* Slack placeholder */}
            <div className="w-[140px] flex justify-center">
              <span className="text-gray-300">—</span>
            </div>

            {/* Frequency dropdown or dash */}
            <div className="w-[100px] flex justify-center">
              {row.hasFrequency ? (
                <Dropdown
                  value={prefs[row.id]?.frequency ?? row.defaultFrequency ?? "realtime"}
                  options={Object.keys(FREQUENCY_LABELS)}
                  labels={FREQUENCY_LABELS}
                  onChange={(v) => updatePref(row.id, "frequency", v)}
                />
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
