"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SubscriptionData {
  credits: number;
  creditsUsed: number;
  tier: string;
  isTrialing: boolean;
  daysLeft: number | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  monthlyCostPaise: number;
}

interface UseSubscriptionResult {
  data: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Client-side helper to signal that a credit-consuming action just
 * succeeded. Any component calling this after e.g. importing leads makes
 * every mounted useSubscription() re-fetch, so the sidebar's credits
 * remaining reflects the change without needing a full page reload.
 */
export const CREDITS_UPDATED_EVENT = "aryasdr:credits-updated";
export function notifyCreditsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CREDITS_UPDATED_EVENT));
}

/**
 * Fetches the current user's subscription info from /api/user/subscription.
 * Auto-refetches on window focus and on the CREDITS_UPDATED_EVENT so the
 * sidebar / billing UI stay in sync after actions that consume credits.
 */
export function useSubscription(): UseSubscriptionResult {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/subscription", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      if (cancelledRef.current) return;
      setData({
        credits: typeof json.credits === "number" ? json.credits : 0,
        creditsUsed:
          typeof json.creditsUsed === "number" ? json.creditsUsed : 0,
        tier: typeof json.tier === "string" ? json.tier : "trial",
        isTrialing: Boolean(json.isTrialing),
        daysLeft:
          typeof json.daysLeft === "number" ? json.daysLeft : null,
        trialEndsAt:
          typeof json.trialEndsAt === "string" ? json.trialEndsAt : null,
        currentPeriodEnd:
          typeof json.currentPeriodEnd === "string"
            ? json.currentPeriodEnd
            : null,
        monthlyCostPaise:
          typeof json.monthlyCostPaise === "number"
            ? json.monthlyCostPaise
            : 0,
      });
      setError(null);
    } catch (err) {
      if (cancelledRef.current) return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();

    function handleRefresh() {
      load();
    }
    function handleFocus() {
      load();
    }
    window.addEventListener(CREDITS_UPDATED_EVENT, handleRefresh);
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelledRef.current = true;
      window.removeEventListener(CREDITS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("focus", handleFocus);
    };
  }, [load]);

  return { data, loading, error, refresh: load };
}
