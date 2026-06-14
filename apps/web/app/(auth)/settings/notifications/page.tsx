"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type NotificationRow = {
  id: string;
  label: string;
  timing: string;
  timingStyle: "violet" | "gray";
  description?: string;
  hasDropdown?: boolean;
  dropdownOptions?: string[];
  defaultRecipient?: string;
  comingSoon?: boolean;
  defaultEmailEnabled?: boolean;
};

const notifications: NotificationRow[] = [
  {
    id: "urgent",
    label: "Urgent alerts",
    timing: "Real-time",
    timingStyle: "violet",
    description: "Get notified when something critical needs your attention",
    hasDropdown: true,
    dropdownOptions: ["All members", "Admins only", "Billing admin", "Custom"],
    defaultRecipient: "All members",
    defaultEmailEnabled: true,
  },
  {
    id: "billing",
    label: "Billing and access",
    timing: "Real-time",
    timingStyle: "violet",
    hasDropdown: true,
    dropdownOptions: ["All members", "Admins only", "Billing admin", "Custom"],
    defaultRecipient: "Billing admin",
    defaultEmailEnabled: true,
  },
  {
    id: "replies",
    label: "Message reply alerts",
    timing: "Real-time",
    timingStyle: "violet",
    hasDropdown: true,
    dropdownOptions: ["All members", "Admins only", "Billing admin", "Custom"],
    defaultRecipient: "All members",
    defaultEmailEnabled: true,
  },
  {
    id: "escalated",
    label: "Escalated replies",
    timing: "Real-time",
    timingStyle: "violet",
    hasDropdown: true,
    dropdownOptions: ["All members", "Admins only", "Billing admin", "Custom"],
    defaultRecipient: "All members",
    defaultEmailEnabled: true,
  },
  {
    id: "meetings",
    label: "Meeting booked alerts",
    timing: "Real-time",
    timingStyle: "violet",
    comingSoon: true,
    defaultEmailEnabled: false,
  },
  {
    id: "visitors",
    label: "Website visitor alerts",
    timing: "Every visitor",
    timingStyle: "violet",
    comingSoon: true,
    defaultEmailEnabled: false,
  },
  {
    id: "overdue",
    label: "Overdue tasks",
    timing: "Coming soon",
    timingStyle: "gray",
    comingSoon: true,
    defaultEmailEnabled: false,
  },
  {
    id: "performance",
    label: "Performance reports",
    timing: "Coming soon",
    timingStyle: "gray",
    comingSoon: true,
    defaultEmailEnabled: false,
  },
  {
    id: "product",
    label: "Product updates",
    timing: "Occasional",
    timingStyle: "gray",
    comingSoon: true,
    defaultEmailEnabled: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Toggle                                                             */
/* ------------------------------------------------------------------ */
function Toggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${enabled ? "bg-[#6C47FF]" : "bg-gray-200"}`}
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
/*  Notifications Page                                                 */
/* ------------------------------------------------------------------ */
export default function NotificationsPage() {
  const router = useRouter();

  // State for recipient dropdowns
  const [recipients, setRecipients] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    notifications.forEach((n) => {
      if (n.defaultRecipient) initial[n.id] = n.defaultRecipient;
    });
    return initial;
  });

  // State for email toggles
  const [emailEnabled, setEmailEnabled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    notifications.forEach((n) => {
      initial[n.id] = n.defaultEmailEnabled ?? false;
    });
    return initial;
  });

  const handleRecipientChange = (id: string, value: string) => {
    setRecipients((prev) => ({ ...prev, [id]: value }));
    toast.success("Notification preference updated");
  };

  const handleToggleEmail = (id: string) => {
    setEmailEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
    toast.success("Notification preference updated");
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose how and when Arya reaches you.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Notification type
          </span>
          <div className="flex items-center gap-6">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </span>
            <button
              onClick={() => router.push("/settings/integrations")}
              className="text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              Integrate Slack
            </button>
          </div>
        </div>

        {/* Rows */}
        {notifications.map((row, idx) => (
          <div
            key={row.id}
            className={`flex items-center justify-between px-6 py-4 ${
              idx < notifications.length - 1 ? "border-b border-gray-100" : ""
            } ${row.comingSoon ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{row.label}</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      row.timingStyle === "violet"
                        ? "bg-violet-50 text-violet-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {row.timing}
                  </span>
                  {row.comingSoon && row.timingStyle !== "gray" && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                      Coming soon
                    </span>
                  )}
                </div>
                {row.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {row.hasDropdown && row.dropdownOptions && (
                <select
                  value={recipients[row.id] || row.dropdownOptions[0]}
                  onChange={(e) => handleRecipientChange(row.id, e.target.value)}
                  disabled={row.comingSoon}
                  className="text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {row.dropdownOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
              <Toggle
                enabled={emailEnabled[row.id] ?? false}
                onToggle={() => handleToggleEmail(row.id)}
                disabled={row.comingSoon}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
