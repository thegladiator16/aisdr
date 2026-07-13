"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Mail,
  UserPlus,
  CheckSquare,
  Pause,
  Users2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  targetUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ListResponse {
  data: NotificationRow[];
  unreadCount: number;
}

function iconForKind(kind: string) {
  switch (kind) {
    case "reply_received":
      return Mail;
    case "lead_added":
      return UserPlus;
    case "task_created":
      return CheckSquare;
    case "campaign_paused":
      return Pause;
    case "team_member_joined":
      return Users2;
    default:
      return Info;
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface NotificationsBellProps {
  collapsed?: boolean;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Position the popup with fixed coordinates anchored to the bell button.
 * The bell lives in the collapsible sidebar; earlier we absolutely-
 * positioned the popup inside the button which caused it to overflow the
 * sidebar's right edge and look right-drifted with dead space. Portalling
 * to document.body + fixed positioning lets it float cleanly to the right
 * of the sidebar regardless of collapsed/expanded state.
 */
export function NotificationsBell({ collapsed = false }: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(
    null
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as ListResponse;
      setItems(json.data || []);
      setUnread(json.unreadCount || 0);
    } catch {
      // network hiccups shouldn't spam the console
    }
  }, []);

  // Initial fetch + 30s poll while visible.
  useEffect(() => {
    load();
    const iv = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        load();
      }
    }, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  // Close on outside click (both button and popover count as "inside").
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Compute popover position from the button rect. Runs on open, on scroll,
  // and on resize so the popover tracks the anchor.
  useIsomorphicLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      // Anchor the popover's bottom to the button's TOP (opens upward),
      // and its LEFT to the button's RIGHT edge with a small gap so the
      // popover clears the sidebar and floats over the main content.
      setCoords({
        left: rect.right + 8,
        bottom: window.innerHeight - rect.top + 4,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  async function handleRowClick(n: NotificationRow) {
    setOpen(false);
    if (!n.readAt) {
      setItems((prev) =>
        prev.map((r) =>
          r.id === n.id ? { ...r, readAt: new Date().toISOString() } : r
        )
      );
      setUnread((c) => Math.max(0, c - 1));
      try {
        await fetch(`/api/notifications/${n.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readAt: new Date().toISOString() }),
        });
      } catch {
        // ignore — next poll will reconcile
      }
    }
    if (n.targetUrl) router.push(n.targetUrl);
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((r) => ({ ...r, readAt: r.readAt ?? now })));
    setUnread(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      // ignore — next poll will reconcile
    }
  }

  const top = items.slice(0, 10);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors relative"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="relative shrink-0">
          <Bell className="h-4 w-4 text-gray-500" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        {!collapsed && <span className="flex-1 text-left">Notifications</span>}
      </button>

      {open && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Notifications"
            style={{ left: coords.left, bottom: coords.bottom }}
            className="fixed z-[100] w-80 rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 ring-1 ring-black/5 overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  {unread} unread
                </span>
              )}
            </div>

            {top.length === 0 ? (
              // Tight empty state — icon + one-liner + subtext, no dead
              // vertical padding. Total height ≈ 128px instead of the
              // previous 200px+ that looked cavernous when the row was
              // small.
              <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-2.5">
                  <BellOff className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">All caught up</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  New activity will show up here.
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {top.map((n) => {
                  const Icon = iconForKind(n.kind);
                  const unreadRow = !n.readAt;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleRowClick(n)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors",
                        unreadRow && "bg-violet-50/40"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center",
                            unreadRow
                              ? "bg-violet-100 text-violet-700"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm text-gray-900 truncate",
                            unreadRow ? "font-semibold" : "font-normal"
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {unreadRow && (
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-100 px-3.5 py-2 flex items-center justify-between">
              <button
                onClick={markAllRead}
                disabled={unread === 0}
                className={cn(
                  "text-xs font-medium transition-colors",
                  unread === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-violet-600 hover:text-violet-700"
                )}
              >
                Mark all as read
              </button>
              <span className="text-[10px] text-gray-400">
                {top.length > 0 ? `Showing ${top.length}` : ""}
              </span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
