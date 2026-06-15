"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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

export function Sidebar({ onChatOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [supportMenuOpen, setSupportMenuOpen] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);

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
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="ml-auto h-2 w-2 rounded-full bg-violet-600" />
            )}
          </>
        )}
      </Link>
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
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#6C47FF] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          {!collapsed && (
            <>
              <span className="font-bold text-gray-900 text-sm">AryaSDR</span>
              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                BETA
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
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
        <button
          onClick={onChatOpen}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="h-5 w-5 rounded-full bg-[#6C47FF] flex items-center justify-center shrink-0">
            <span className="text-white text-[8px] font-bold">A</span>
          </div>
          {!collapsed && <span>Chat with Arya</span>}
        </button>

        {/* Credits */}
        {!collapsed && (
          <button
            onClick={() => setShowPlanModal(true)}
            className="w-full rounded-lg px-3 py-2 hover:bg-violet-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Credits</span>
              <span className="font-semibold text-gray-900">10,000</span>
            </div>
            <div className="mt-1.5 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-full bg-[#6C47FF] rounded-full" />
            </div>
          </button>
        )}

        {/* Support */}
        <div ref={supportMenuRef} className="relative">
          <button
            onClick={() => setSupportMenuOpen(!supportMenuOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-gray-500 shrink-0" />
            {!collapsed && <span>Support</span>}
          </button>
          {supportMenuOpen && !collapsed && (
            <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Send className="h-3.5 w-3.5" />
                Talk to support
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <HelpCircle className="h-3.5 w-3.5" />
                Help center
              </button>
            </div>
          )}
        </div>

        {/* User row */}
        <div ref={userMenuRef} className="relative">
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
    </aside>
  );
}
