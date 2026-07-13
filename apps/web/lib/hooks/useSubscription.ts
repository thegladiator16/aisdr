"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

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
 * succeeded. Dispatches a shared event; the module-level store below reacts
 * once and fans out to every mounted useSubscription() consumer.
 */
export const CREDITS_UPDATED_EVENT = "aryasdr:credits-updated";
export function notifyCreditsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CREDITS_UPDATED_EVENT));
}

/* ------------------------------------------------------------------ */
/*  Module-level shared store                                          */
/*                                                                     */
/*  Before this refactor every call site (AuthShell + Sidebar +        */
/*  AryaChatWidget + per-page copies) mounted its own state and fired  */
/*  its own fetch — so first paint made 3-4 concurrent requests to     */
/*  the same endpoint, and every focus/CREDITS_UPDATED_EVENT triggered */
/*  a parallel refetch storm. Consolidating into one shared store cuts */
/*  that fan-out to a single request while keeping the same public API */
/*  and refresh semantics.                                             */
/* ------------------------------------------------------------------ */

type StoreState = {
  data: SubscriptionData | null;
  loading: boolean;
  error: string | null;
};

let storeState: StoreState = { data: null, loading: true, error: null };
let inflight: Promise<void> | null = null;
let listenersAttached = false;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function setState(next: Partial<StoreState>) {
  storeState = { ...storeState, ...next };
  notify();
}

function coerce(json: unknown): SubscriptionData {
  const j = (json ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" ? v : fallback;
  const nullableStr = (v: unknown) => (typeof v === "string" ? v : null);
  const nullableNum = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    credits: num(j.credits),
    creditsUsed: num(j.creditsUsed),
    tier: str(j.tier, "trial"),
    isTrialing: Boolean(j.isTrialing),
    daysLeft: nullableNum(j.daysLeft),
    trialEndsAt: nullableStr(j.trialEndsAt),
    currentPeriodEnd: nullableStr(j.currentPeriodEnd),
    monthlyCostPaise: num(j.monthlyCostPaise),
  };
}

async function load(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/user/subscription", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setState({ data: coerce(json), error: null, loading: false });
    } catch (err) {
      setState({
        error: err instanceof Error ? err.message : "Unknown error",
        loading: false,
      });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function ensureListenersAttached() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("focus", () => {
    void load();
  });
  window.addEventListener(CREDITS_UPDATED_EVENT, () => {
    void load();
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): StoreState {
  return storeState;
}

function getServerSnapshot(): StoreState {
  return { data: null, loading: true, error: null };
}

/**
 * Fetches the current user's subscription info from /api/user/subscription.
 * All mounted copies share one in-flight request and one cached result;
 * focus + credits-updated events trigger a single coordinated re-fetch.
 */
export function useSubscription(): UseSubscriptionResult {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureListenersAttached();
    if (storeState.data === null && !inflight) {
      void load();
    }
  }, []);

  const refresh = useCallback(() => {
    void load();
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}
