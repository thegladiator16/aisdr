"use client";

import { useRouter } from "next/navigation";

type NotificationRow = {
  id: string;
  label: string;
  timing: string;
  timingStyle: "violet" | "gray";
  description?: string;
  comingSoon?: boolean;
};

const ROWS: NotificationRow[] = [
  {
    id: "urgent",
    label: "Urgent alerts",
    timing: "Real-time",
    timingStyle: "violet",
    description: "Get notified when something critical needs your attention",
  },
  {
    id: "billing",
    label: "Billing and access",
    timing: "Real-time",
    timingStyle: "violet",
  },
  {
    id: "replies",
    label: "Message reply alerts",
    timing: "Real-time",
    timingStyle: "violet",
  },
  {
    id: "escalated",
    label: "Escalated replies",
    timing: "Real-time",
    timingStyle: "violet",
  },
  {
    id: "meetings",
    label: "Meeting booked alerts",
    timing: "Real-time",
    timingStyle: "violet",
    comingSoon: true,
  },
  {
    id: "visitors",
    label: "Website visitor alerts",
    timing: "Every visitor",
    timingStyle: "violet",
    comingSoon: true,
  },
  {
    id: "overdue",
    label: "Overdue tasks",
    timing: "Coming soon",
    timingStyle: "gray",
    comingSoon: true,
  },
  {
    id: "performance",
    label: "Performance reports",
    timing: "Coming soon",
    timingStyle: "gray",
    comingSoon: true,
  },
  {
    id: "product",
    label: "Product updates",
    timing: "Occasional",
    timingStyle: "gray",
    comingSoon: true,
  },
];

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose how and when Arya reaches you.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Notification type
          </span>
          <button
            type="button"
            onClick={() => router.push("/settings/integrations")}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
          >
            Integrate Slack
          </button>
        </div>

        {/* Rows */}
        {ROWS.map((row, idx) => (
          <div
            key={row.id}
            className={`flex items-center justify-between px-6 py-4 ${
              idx < ROWS.length - 1 ? "border-b border-gray-100" : ""
            } ${row.comingSoon ? "opacity-50" : ""}`}
          >
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
                <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
              )}
            </div>

            {/* Active indicator dot for live notifications */}
            {!row.comingSoon && (
              <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
