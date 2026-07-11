"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";

type MailboxHealth = {
  score: number;
  breakdown: {
    sentLast30Days: number;
    bouncesLast30Days: number;
    bounceRate: number;
    openRate: number;
    replyRate: number;
    spamComplaintsLast30Days: number;
  };
  factors: string[];
};

export function MailboxHealthWidget() {
  const [health, setHealth] = useState<MailboxHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/mailbox-health");
        if (!res.ok) {
          toast.error("Could not load mailbox health");
          if (!cancelled) setLoading(false);
          return;
        }
        const json = (await res.json()) as MailboxHealth;
        if (!cancelled) {
          setHealth(json);
          setLoading(false);
        }
      } catch {
        toast.error("Could not load mailbox health");
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Computing mailbox health...</span>
      </div>
    );
  }

  if (!health) return null;

  const scoreColor =
    health.score >= 80
      ? "text-emerald-600 bg-emerald-50"
      : health.score >= 60
      ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";

  const barColor =
    health.score >= 80
      ? "bg-emerald-500"
      : health.score >= 60
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div
          className={`h-16 w-16 rounded-xl flex items-center justify-center shrink-0 ${scoreColor}`}
        >
          <span className="text-2xl font-bold">{health.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Mailbox health</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {health.breakdown.sentLast30Days} sent · open{" "}
            {(health.breakdown.openRate * 100).toFixed(0)}% · bounce{" "}
            {(health.breakdown.bounceRate * 100).toFixed(1)}% · reply{" "}
            {(health.breakdown.replyRate * 100).toFixed(1)}%
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${health.score}%` }}
            />
          </div>
        </div>
      </div>
      {health.factors.length > 0 && (
        <ul className="space-y-1 pl-1">
          {health.factors.slice(0, 3).map((f) => (
            <li key={f} className="text-xs text-gray-600">
              · {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
