import { getCurrentUser } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/db/queries";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { BrandLogo, type BrandLogoName } from "@/components/brand/BrandLogo";

const REAL_INTEGRATIONS: {
  type: string;
  label: string;
  description: string;
  brand: BrandLogoName;
  connectUrl: string;
}[] = [
  {
    type: "gmail",
    label: "Gmail",
    description: "Send emails from your Gmail account. Replies sync automatically.",
    brand: "gmail",
    connectUrl: "/api/v1/integrations/gmail",
  },
  {
    type: "google_calendar",
    label: "Google Calendar",
    description: "Auto-create calendar events when meetings are booked.",
    brand: "google-calendar",
    connectUrl: "/api/v1/integrations/gmail",
  },
];

const COMING_SOON: {
  label: string;
  description: string;
  brand: BrandLogoName;
}[] = [
  {
    label: "HubSpot",
    description: "Sync contacts and deals with your HubSpot CRM",
    brand: "hubspot",
  },
  {
    label: "Salesforce",
    description: "Connect your Salesforce account for lead management",
    brand: "salesforce",
  },
  {
    label: "Slack",
    description: "Get real-time notifications and updates in your Slack workspace",
    brand: "slack",
  },
  {
    label: "LinkedIn",
    description: "Send connection requests and DMs via PhantomBuster",
    brand: "linkedin",
  },
  {
    label: "WhatsApp Business",
    description: "Send WhatsApp messages to Indian leads via Meta Cloud API",
    brand: "whatsapp",
  },
];

export default async function SettingsIntegrationsPage({
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

  const connectedTypes = new Set(
    userIntegrations.filter((i) => i.accessToken).map((i) => i.type)
  );
  const gmailIntegration = userIntegrations.find((i) => i.type === "gmail");

  const googleNotConfigured = searchParams.error === "google_not_configured";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your accounts to enable automated outreach.
        </p>
      </div>

      {searchParams.connected && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {searchParams.connected} connected successfully!
        </div>
      )}

      {googleNotConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Google OAuth not configured
          </div>
          <p className="text-xs text-amber-700/80 leading-relaxed">
            To enable Gmail and Calendar, set{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5">GOOGLE_CLIENT_SECRET</code> in your
            environment variables.
          </p>
        </div>
      )}

      {searchParams.error && !googleNotConfigured && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Connection failed. Please try again.
        </div>
      )}

      {/* Email & Calendar */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Email &amp; Calendar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REAL_INTEGRATIONS.map(({ type, label, description, brand, connectUrl }) => {
            const isConnected = connectedTypes.has("gmail"); // one OAuth grant covers both
            return (
              <div
                key={type}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
                    <BrandLogo brand={brand} className="h-8 w-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    {isConnected && gmailIntegration?.accountEmail && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {gmailIntegration.accountEmail}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">{description}</p>
                {isConnected ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">
                        {gmailIntegration?.emailsSentToday ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">Today</p>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <p className="text-sm font-bold text-gray-900">
                        {gmailIntegration?.dailyEmailLimit ?? "—"}
                      </p>
                      <p className="text-xs text-gray-500">Limit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">
                        {gmailIntegration?.status === "active" ? "✓" : "!"}
                      </p>
                      <p className="text-xs text-gray-500">Status</p>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={connectUrl}
                    className="inline-flex items-center justify-center rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors"
                  >
                    Connect {label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming soon */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          More integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMING_SOON.map(({ label, description, brand }) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-4"
            >
              <div className="shrink-0 h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <BrandLogo brand={brand} className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
                    <Clock className="h-3 w-3" />
                    Coming soon
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
