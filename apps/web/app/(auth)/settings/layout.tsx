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
    // Two independent scroll columns. Outer container fills AuthShell's
    // full-height settings pane (overflow-hidden from the shell), then each
    // column gets its OWN overflow-y-auto so wheeling the nav doesn't
    // scroll the billing pane and vice versa. overscroll-contain on both
    // stops wheel events from bubbling to the outer container.
    <div className="flex h-full overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white overflow-y-auto overscroll-contain">
        <div className="p-4">
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
        </div>
      </aside>
      <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-50 min-w-0">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
