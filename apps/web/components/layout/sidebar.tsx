"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Send,
  BarChart2,
  Users2,
  Inbox,
  CheckSquare,
  Phone,
  Search,
  Wifi,
  Globe,
  List,
  User,
  HelpCircle,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Coins,

} from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { ChangePlanModal } from "@/components/billing/ChangePlanModal";
import { CreditsModal } from "@/components/billing/CreditsModal";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";

const MANAGE_ITEMS = [
  { href: "/dashboard/manage", label: "Manage Arya", icon: Sparkles },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/team", label: "Team", icon: Users2 },
];

const ENGAGE_ITEMS = [
  { href: "/inbox", label: "Inbox", icon: Inbox, badge: true },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dialer", label: "Dialer", icon: Phone },
];

const DISCOVERY_ITEMS = [
  { href: "/find-leads", label: "Find leads", icon: Search },
  { href: "/signals", label: "Signals", icon: Wifi },
  { href: "/website-visitors", label: "Website visitors", icon: Globe },
];

const LEAD_MGMT_ITEMS = [
  { href: "/lists", label: "Lists", icon: List },
  { href: "/leads", label: "Leads", icon: User },
];

interface SidebarProps {
  onChatOpen?: () => void;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function SidebarTooltip({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (!hovered || !wrapRef.current) return;
    const update = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hovered]);

  if (!show) return <>{children}</>;
  return (
    <>
      <div
        ref={wrapRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setCoords(null);
        }}
      >
        {children}
      </div>
      {hovered && coords && typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: coords.top, left: coords.left, transform: "translateY(-50%)" }}
            className="pointer-events-none fixed z-[100] whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-md"
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}

export function Sidebar({ onChatOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const collapsedHydrated = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("aryasdr.sidebar.collapsed");
      if (saved === "1") setCollapsed(true);
    } catch {
      /* localStorage disabled — ignore */
    } finally {
      collapsedHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!collapsedHydrated.current) return;
    try {
      window.localStorage.setItem(
        "aryasdr.sidebar.collapsed",
        collapsed ? "1" : "0"
      );
    } catch {
      /* localStorage disabled — best-effort only */
    }
  }, [collapsed]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [supportMenuOpen, setSupportMenuOpen] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);
  const { data: subscription } = useSubscription();

  const credits = subscription?.credits ?? 10000;
  const creditsUsed = subscription?.creditsUsed ?? 0;
  const creditsRemaining = Math.max(0, credits - creditsUsed);
  const creditsRemainingRatio = credits > 0 ? creditsRemaining / credits : 0;
  const creditsRemainingPct = creditsRemainingRatio * 100;
  const creditsRemainingPctLabel = Math.round(creditsRemainingPct);
  // Visual amplification: on a 10k plan, 100 credits = 1% = ~1.5px on a 148px
  // bar — invisible. When ANY credits have been used, cap the visible fill
  // at 92% so the shrink is always at least ~12px. The number below stays
  // authoritative, so no data is lost — only the visual gets an honest
  // "yes, you've started spending" cue.
  const creditsBarPct =
    creditsUsed > 0 ? Math.min(creditsRemainingPct, 92) : creditsRemainingPct;
  const creditsBarColor =
    creditsRemainingRatio > 0.5 ? "bg-violet-500" : creditsRemainingRatio > 0.2 ? "bg-amber-400" : "bg-red-500";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (supportMenuRef.current && !supportMenuRef.current.contains(e.target as Node)) {
        setSupportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  function NavItem({
    href,
    label,
    icon: Icon,
    badge,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: boolean;
  }) {
    const active = isActive(href);
    return (
      <SidebarTooltip label={label} show={collapsed}>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            active
              ? "bg-violet-50 text-violet-700 font-medium"
              : "text-gray-700 hover:bg-gray-50"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              active ? "text-violet-600" : "text-gray-500"
            )}
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-1 items-center gap-1 overflow-hidden whitespace-nowrap"
              >
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-violet-600 shrink-0" />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </SidebarTooltip>
    );
  }


  function SectionHeader({ title }: { title: string }) {
    if (collapsed) return <div className="my-2 border-t border-gray-100" />;
    return (
      <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase text-gray-400 tracking-wider">
        {title}
      </p>
    );
  }

  const displayName = user?.fullName || user?.firstName || "User";
  const displayEmail =
    user?.primaryEmailAddress?.emailAddress || "user@example.com";

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-screen flex-col border-r border-gray-200 bg-white overflow-hidden shrink-0"
    >
      {/* Header — fixed height so collapse/expand doesn't jog the nav below */}
      <div className={cn(
        "flex h-14 items-center px-3 border-b border-gray-100 shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#6C47FF] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">AryaSDR</span>
            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
              BETA
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <SectionHeader title="Manage" />
        {MANAGE_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <SectionHeader title="Engage" />
        {ENGAGE_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <SectionHeader title="Lead discovery" />
        {DISCOVERY_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <SectionHeader title="Lead management" />
        {LEAD_MGMT_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
        {/* Chat with Arya */}
        <SidebarTooltip label="Chat with Arya" show={collapsed}>
          <button
            onClick={onChatOpen}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <div className="h-5 w-5 rounded-full bg-[#6C47FF] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">A</span>
            </div>
            {!collapsed && <span>Chat with Arya</span>}
          </button>
        </SidebarTooltip>

        {/* Credits */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.button
              key="credits-widget"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => setShowCreditsModal(true)}
              title={`${creditsUsed.toLocaleString()} of ${credits.toLocaleString()} used`}
              className="w-full rounded-lg px-3 py-2 hover:bg-violet-50 cursor-pointer transition-colors overflow-hidden"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Credits</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {creditsRemaining.toLocaleString()}
                </span>
              </div>
              <div className="mt-1.5 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${creditsBarColor}`}
                  style={{ width: `${creditsBarPct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400 tabular-nums">
                <span>{creditsRemainingPctLabel}% left</span>
                <span>of {credits.toLocaleString()}</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Notifications bell — polls /api/notifications every 30s */}
        <SidebarTooltip label="Notifications" show={collapsed}>
          <NotificationsBell collapsed={collapsed} />
        </SidebarTooltip>

        {/* Support */}
        <div ref={supportMenuRef} className="relative">
          <SidebarTooltip label="Support" show={collapsed}>
            <button
              onClick={() => setSupportMenuOpen(!supportMenuOpen)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-gray-500 shrink-0" />
              {!collapsed && <span>Support</span>}
            </button>
          </SidebarTooltip>
          {supportMenuOpen && !collapsed && (
            <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
              <a
                href="mailto:support@aryasdr.in?subject=Support%20request"
                onClick={() => setSupportMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Send className="h-3.5 w-3.5" />
                Talk to support
              </a>
              <Link
                href="/contact"
                onClick={() => setSupportMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Help center
              </Link>
            </div>
          )}
        </div>

        {/* User row */}
        <div ref={userMenuRef} className="relative">
          <SidebarTooltip label={displayName} show={collapsed}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 text-xs font-semibold text-violet-700">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {displayEmail}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                </>
              )}
            </button>
          </SidebarTooltip>
          {userMenuOpen && !collapsed && (
            <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500">{displayEmail}</p>
              </div>
              <Link
                href="/settings/organization"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Building2 className="h-3.5 w-3.5" />
                AryaSDR&apos;s organization
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      {showPlanModal && <ChangePlanModal onClose={() => setShowPlanModal(false)} />}
      {showCreditsModal && <CreditsModal onClose={() => setShowCreditsModal(false)} />}
    </motion.aside>
  );
}
