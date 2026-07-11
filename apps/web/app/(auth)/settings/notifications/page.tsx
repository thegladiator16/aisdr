"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type NotificationRow = {
  id: string;
  label: string;
  timing: string;
  timingStyle: "violet" | "gray";
  description?: string;
  comingSoon?: boolean;
  defaultEmailEnabled?: boolean;
};

// Row ids for the 4 non-comingSoon rows double as the `notificationType`
// keys sent to /api/user/notifications (kept consistent with the API route's
// NOTIFICATION_TYPES). The other 5 rows are honestly marked "coming soon"
// and have no backend, so they stay purely local/disabled.
const notifications: NotificationRow[] = [
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

const REAL_NOTIFICATION_IDS = new Set(
  notifications.filter((n) => !n.comingSoon).map((n) => n.id)
);

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

  const [loading, setLoading] = useState(true);

  // State for email toggles
  const [emailEnabled, setEmailEnabled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    notifications.forEach((n) => {
      initial[n.id] = n.defaultEmailEnabled ?? true;
    });
    return initial;
  });

  // Tracks in-flight PUTs per row so the toggle can be disabled while saving.
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/user/notifications");
        if (!res.ok) throw new Error("Failed to load notification preferences");
        const json = await res.json();
        if (cancelled) return;

        const data = json?.data as
          | Record<string, { emailEnabled: boolean }>
          | undefined;
        if (data) {
          setEmailEnabled((prev) => {
            const next = { ...prev };
            for (const id of Object.keys(data)) {
              if (REAL_NOTIFICATION_IDS.has(id)) {
                next[id] = !!data[id]?.emailEnabled;
              }
            }
            return next;
          });
        }
      } catch (err) {
        if (!cancelled) {
          toast.error("Could not load notification preferences");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleEmail = async (id: string) => {
    if (!REAL_NOTIFICATION_IDS.has(id) || savingIds[id]) return;

    const nextValue = !emailEnabled[id];
    setEmailEnabled((prev) => ({ ...prev, [id]: nextValue }));
    setSavingIds((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationType: id, emailEnabled: nextValue }),
      });

      if (!res.ok) throw new Error("Failed to update notification preference");

      toast.success("Notification preference updated");
    } catch (err) {
      // Revert the optimistic update on failure.
      setEmailEnabled((prev) => ({ ...prev, [id]: !nextValue }));
      toast.error("Failed to update notification preference");
    } finally {
      setSavingIds((prev) => ({ ...prev, [id]: false }));
    }
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

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            Loading notification preferences…
          </div>
        ) : (
          /* Rows */
          notifications.map((row, idx) => (
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
                <Toggle
                  enabled={emailEnabled[row.id] ?? false}
                  onToggle={() => handleToggleEmail(row.id)}
                  disabled={row.comingSoon || savingIds[row.id]}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
