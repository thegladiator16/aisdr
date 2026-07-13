"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Building2,
  Shield,
  Bell,
  Plug,
  CreditCard,
  KeyRound,
} from "lucide-react";

const navItems = [
  { label: "My profile", href: "/settings/profile", icon: User },
  { label: "Organization", href: "/settings/organization", icon: Building2 },
  { label: "Access controls", href: "/settings/access-controls", icon: Shield },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
  { label: "Integrations", href: "/settings/integrations", icon: Plug },
  { label: "API keys", href: "/settings/api-keys", icon: KeyRound },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sticky sub-nav so it stays put while the main pane scrolls. Height
          is calc(100vh - <top offset>) so it doesn't shrink below the fold. */}
      <aside className="w-64 border-r border-gray-200 bg-white p-4 sticky top-0 self-start h-screen overflow-y-auto shrink-0">
        <h2 className="px-3 mb-4 text-lg font-semibold text-gray-900">
          Settings
        </h2>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6 bg-gray-50 min-w-0">{children}</main>
    </div>
  );
}
