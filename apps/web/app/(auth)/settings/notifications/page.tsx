"use client";

import { Bell } from "lucide-react";

type NotificationRow = {
  label: string;
  timing: string;
  timingStyle: "violet" | "gray";
  description?: string;
  dropdown?: string[];
  comingSoon?: boolean;
  emailEnabled?: boolean;
};

const notifications: NotificationRow[] = [
  {
    label: "Urgent alerts",
    timing: "Real-time",
    timingStyle: "violet",
    description:
      "Get notified when something critical needs your attention",
    emailEnabled: true,
  },
  {
    label: "Billing and access",
    timing: "Real-time",
    timingStyle: "violet",
    dropdown: ["Billing admin", "All members", "Owner only"],
    emailEnabled: true,
  },
  {
    label: "Message reply alerts",
    timing: "Real-time",
    timingStyle: "violet",
    dropdown: ["All members", "Assigned member", "Owner only"],
    emailEnabled: true,
  },
  {
    label: "Escalated replies",
    timing: "Real-time",
    timingStyle: "violet",
    dropdown: ["All members", "Assigned member", "Owner only"],
    emailEnabled: true,
  },
  {
    label: "Meeting booked alerts",
    timing: "Real-time",
    timingStyle: "violet",
    comingSoon: true,
  },
  {
    label: "Website visitor alerts",
    timing: "Every visitor",
    timingStyle: "violet",
    comingSoon: true,
  },
  {
    label: "Overdue tasks",
    timing: "Coming soon",
    timingStyle: "gray",
    comingSoon: true,
  },
  {
    label: "Performance reports",
    timing: "Coming soon",
    timingStyle: "gray",
    comingSoon: true,
  },
  {
    label: "Product updates",
    timing: "Occasional",
    timingStyle: "gray",
    comingSoon: true,
  },
];

export default function NotificationsPage() {
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
            <a
              href="#"
              className="text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              Integrate Slack
            </a>
          </div>
        </div>

        {/* Rows */}
        {notifications.map((row, idx) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-6 py-4 ${
              idx < notifications.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
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
                  {row.comingSoon && row.timingStyle !== "gray" && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                      Coming soon
                    </span>
                  )}
                </div>
                {row.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {row.dropdown && (
                <select className="text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
                  {row.dropdown.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {row.emailEnabled ? (
                <div className="h-5 w-9 bg-[#6C47FF] rounded-full flex items-center justify-end px-[3px]">
                  <span className="h-3.5 w-3.5 bg-white rounded-full" />
                </div>
              ) : (
                <div className="h-5 w-9 bg-gray-200 rounded-full flex items-center px-[3px]">
                  <span className="h-3.5 w-3.5 bg-white rounded-full" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
