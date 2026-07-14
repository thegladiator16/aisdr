import { getCurrentUser } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/db/queries";
import { CheckCircle2, AlertCircle, Clock, Phone, Search, KeyRound } from "lucide-react";
import Link from "next/link";
import { BrandLogo, type BrandLogoName } from "@/components/brand/BrandLogo";
import GmailSmtpForm from "@/components/integrations/GmailSmtpForm";
import GoogleCalendarForm from "@/components/integrations/GoogleCalendarForm";
import SlackWebhookForm from "@/components/integrations/SlackWebhookForm";

const CRM_INTEGRATIONS: {
  type: string;
  label: string;
  description: string;
  brand?: BrandLogoName;
  envKey: string;
}[] = [
  {
    type: "linkedin_unipile",
    label: "LinkedIn (Unipile)",
    description:
      "Send LinkedIn messages and connection requests via Unipile API.",
    brand: "linkedin",
    envKey: "UNIPILE_API_KEY",
  },
  {
    type: "hubspot",
    label: "HubSpot CRM",
    description: "Sync contacts, deals, and engagement data with HubSpot.",
    brand: "hubspot",
    envKey: "HUBSPOT_API_KEY",
  },
  {
    type: "salesforce",
    label: "Salesforce CRM",
    description: "Push leads and sync pipeline data with Salesforce.",
    brand: "salesforce",
    envKey: "SALESFORCE_API_KEY",
  },
  {
    type: "apollo",
    label: "Apollo.io",
    description:
      "Enrich leads and find verified contact information with Apollo.",
    envKey: "APOLLO_API_KEY",
  },
];

const COMMS_INTEGRATIONS: {
  type: string;
  label: string;
  description: string;
  brand?: BrandLogoName;
  envKey: string;
}[] = [
  {
    type: "twilio",
    label: "Twilio",
    description:
      "Send WhatsApp messages, SMS, and make voice calls via Twilio APIs.",
    envKey: "TWILIO_ACCOUNT_SID",
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
  const gmailCfg = (gmailIntegration?.config ?? {}) as Record<string, unknown>;
  const gmailConnected = !!(
    gmailIntegration?.accessToken &&
    gmailIntegration?.accountEmail &&
    gmailCfg.connection_type === "smtp"
  );

  const calendarIntegration = userIntegrations.find((i) => i.type === "google_calendar");
  const calendarConnected = !!(calendarIntegration?.accessToken);

  const slackIntegration = userIntegrations.find((i) => i.type === "slack");
  const slackConnected = !!(slackIntegration?.webhookUrl);

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

      {searchParams.error && (
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
          <GmailSmtpForm
            initialConnected={gmailConnected}
            initialEmail={gmailIntegration?.accountEmail ?? undefined}
            initialName={gmailIntegration?.accountName ?? undefined}
            emailsSentToday={gmailIntegration?.emailsSentToday ?? 0}
            dailyEmailLimit={gmailIntegration?.dailyEmailLimit ?? undefined}
            status={gmailIntegration?.status ?? undefined}
          />

          <GoogleCalendarForm
            initialConnected={calendarConnected}
            initialCalendarUrl={calendarIntegration?.accessToken ?? undefined}
          />
        </div>
      </div>

      {/* Communications */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Communications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMS_INTEGRATIONS.map(({ type, label, description, brand, envKey }) => {
            const isConnected = connectedTypes.has(type);
            const envConfigured = process.env[envKey];
            return (
              <div
                key={type}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
                    {brand ? (
                      <BrandLogo brand={brand} className="h-8 w-8" />
                    ) : (
                      <Phone className="h-6 w-6 text-[#6C47FF]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {label}
                      </h3>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Not connected
                        </span>
                      )}
                    </div>
                    {!envConfigured && !isConnected && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />
                        Requires {envKey}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">{description}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700 border border-green-200">
                    WhatsApp
                  </span>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 border border-blue-200">
                    SMS
                  </span>
                  <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs text-violet-700 border border-violet-200">
                    Voice
                  </span>
                </div>
                {!isConnected && (
                  <Link
                    href={`/settings/api-keys?setup=${type}`}
                    className="inline-flex items-center justify-center rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all duration-150"
                  >
                    Connect {label}
                  </Link>
                )}
              </div>
            );
          })}

          <SlackWebhookForm
            initialConnected={slackConnected}
            initialChannel={(slackIntegration?.config as Record<string, unknown>)?.channel_name as string | undefined}
          />
        </div>
      </div>

      {/* CRM & Sales Intelligence */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          CRM &amp; Sales Intelligence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CRM_INTEGRATIONS.map(({ type, label, description, brand, envKey }) => {
            const isConnected = connectedTypes.has(type);
            const envConfigured = process.env[envKey];
            return (
              <div
                key={type}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 h-full"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
                    {brand ? (
                      <BrandLogo brand={brand} className="h-8 w-8" />
                    ) : (
                      <Search className="h-6 w-6 text-[#6C47FF]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {label}
                      </h3>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Not connected
                        </span>
                      )}
                    </div>
                    {!envConfigured && !isConnected && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />
                        Requires {envKey}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">{description}</p>
                {!isConnected && (
                  <Link
                    href={`/settings/api-keys?setup=${type}`}
                    className="mt-auto inline-flex items-center justify-center rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] active:scale-[0.98] transition-all duration-150"
                  >
                    Connect {label.split(" (")[0]}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
