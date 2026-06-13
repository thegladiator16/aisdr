"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Inbox,
  Calendar,
  Plug,
  BarChart2,
  Settings,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/deliverability", label: "Deliverability", icon: Shield },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
        <AryaAvatar size="sm" />
        <span className="font-bold text-gray-900">AI SDR</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-[#F0EEFF] text-[#6C47FF] font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-lg bg-[#F0EEFF] p-3">
        <p className="text-xs font-medium text-[#6C47FF]">Free plan</p>
        <p className="text-xs text-gray-500 mt-0.5">Upgrade to unlock unlimited outreach</p>
        <Link
          href="/pricing"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#6C47FF] hover:underline"
        >
          Upgrade <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="border-t border-gray-200 p-4 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}
