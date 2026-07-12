"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
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

export function NotificationsBell({ collapsed = false }: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Initial fetch + 30s poll.
  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  // Close-on-outside-click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function handleRowClick(n: NotificationRow) {
    setOpen(false);
    // Optimistic: mark this one read locally, then persist.
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
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors relative"
        aria-label="Notifications"
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

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unread > 0 && (
              <span className="text-[11px] text-gray-500">
                {unread} unread
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {top.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                You&apos;re all caught up.
              </div>
            ) : (
              top.map((n) => {
                const Icon = iconForKind(n.kind);
                const unreadRow = !n.readAt;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleRowClick(n)}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0",
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
              })
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between">
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className={cn(
                "text-xs font-medium",
                unread === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-violet-600 hover:text-violet-700"
              )}
            >
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
