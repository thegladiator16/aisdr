import { getCurrentUser } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/db/queries";
import {
  Mail,
  Linkedin,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const INTEGRATIONS = [
  {
    type: "gmail",
    label: "Gmail",
    description:
      "Send emails from your Gmail account. Replies sync automatically.",
    icon: Mail,
    connectUrl: "/api/v1/integrations/gmail",
    color: "text-red-400 bg-red-400/10",
    comingSoon: false,
    external: false,
  },
  {
    type: "google_calendar",
    label: "Google Calendar",
    description: "Auto-create calendar events when meetings are booked.",
    icon: Calendar,
    connectUrl: "/api/v1/integrations/gmail",
    color: "text-blue-400 bg-blue-400/10",
    comingSoon: false,
    external: false,
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    description:
      "Send connection requests and DMs via PhantomBuster.",
    icon: Linkedin,
    connectUrl: "/integrations/linkedin-setup",
    color: "text-blue-500 bg-blue-500/10",
    comingSoon: true,
    external: false,
  },
  {
    type: "whatsapp",
    label: "WhatsApp Business",
    description:
      "Send WhatsApp messages to Indian leads via Meta Cloud API.",
    icon: MessageCircle,
    connectUrl: "/integrations/whatsapp-setup",
    color: "text-green-400 bg-green-400/10",
    comingSoon: true,
    external: false,
  },
];

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  let userIntegrations: Awaited<ReturnType<typeof getUserIntegrations>> = [];

  try {
    const user = await getCurrentUser();
    if (user) {
      userIntegrations = await getUserIntegrations(user.id);
    }
  } catch {
    userIntegrations = [];
  }

  const connectedTypes = new Set(userIntegrations.map((i) => i.type));

  const googleNotConfigured = searchParams.error === "google_not_configured";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your accounts to enable automated outreach.
        </p>
      </div>

      {searchParams.connected && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {searchParams.connected} connected successfully!
        </div>
      )}

      {googleNotConfigured && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Google OAuth not configured
          </div>
          <p className="text-xs text-amber-400/80 leading-relaxed">
            To enable Gmail and Calendar, set{" "}
            <code className="rounded bg-amber-400/10 px-1 py-0.5">
              GOOGLE_CLIENT_ID
            </code>{" "}
            and{" "}
            <code className="rounded bg-amber-400/10 px-1 py-0.5">
              GOOGLE_CLIENT_SECRET
            </code>{" "}
            in your Vercel environment variables, then add{" "}
            <code className="rounded bg-amber-400/10 px-1 py-0.5">
              https://aryasdr.in/api/v1/integrations/gmail
            </code>{" "}
            as an authorized redirect URI in Google Cloud Console.
          </p>
        </div>
      )}

      {searchParams.error && !googleNotConfigured && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Connection failed. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {INTEGRATIONS.map(
          ({ type, label, description, icon: Icon, connectUrl, color, comingSoon }) => {
            const isConnected = connectedTypes.has(type);
            const integration = userIntegrations.find((i) => i.type === type);

            return (
              <div
                key={type}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2.5", color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{label}</h3>
                      {comingSoon && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-xs text-amber-400">
                          <Clock className="h-3 w-3" />
                          Coming Soon
                        </span>
                      )}
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    {integration?.accountEmail && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {integration.accountEmail}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{description}</p>

                {isConnected ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">
                        {integration?.emailsSentToday ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                    <div className="text-center border-x border-border">
                      <p className="text-sm font-bold text-foreground">
                        {integration?.dailyEmailLimit ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Limit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">
                        {integration?.status === "active" ? "✓" : "!"}
                      </p>
                      <p className="text-xs text-muted-foreground">Status</p>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={connectUrl}
                    className={cn(
                      "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors",
                      comingSoon
                        ? "text-muted-foreground hover:bg-accent cursor-pointer"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    {comingSoon ? `Learn about ${label}` : `Connect ${label}`}
                  </Link>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
