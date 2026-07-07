"use client";

import { useEffect, useState } from "react";

export interface SubscriptionData {
  credits: number;
  creditsUsed: number;
  tier: string;
  isTrialing: boolean;
  daysLeft: number | null;
}

interface UseSubscriptionResult {
  data: SubscriptionData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the current user's subscription info from /api/user/subscription.
 * Returns { credits, creditsUsed, tier, isTrialing, daysLeft } along with
 * loading and error state.
 */
export function useSubscription(): UseSubscriptionResult {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/user/subscription", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (cancelled) return;
        setData({
          credits: typeof json.credits === "number" ? json.credits : 0,
          creditsUsed:
            typeof json.creditsUsed === "number" ? json.creditsUsed : 0,
          tier: typeof json.tier === "string" ? json.tier : "trial",
          isTrialing: Boolean(json.isTrialing),
          daysLeft:
            typeof json.daysLeft === "number" ? json.daysLeft : null,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
