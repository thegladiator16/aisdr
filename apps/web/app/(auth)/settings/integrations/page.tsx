import { getCurrentUser } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/db/queries";
import { CheckCircle2, AlertCircle } from "lucide-react";
import GmailSmtpForm from "@/components/integrations/GmailSmtpForm";
import GoogleCalendarForm from "@/components/integrations/GoogleCalendarForm";
import SlackWebhookForm from "@/components/integrations/SlackWebhookForm";
import TwilioForm from "@/components/integrations/TwilioForm";
import ApiKeyIntegrationForm from "@/components/integrations/ApiKeyIntegrationForm";
import type { BrandLogoName } from "@/components/brand/BrandLogo";

const CRM_INTEGRATIONS: {
  type: string;
  label: string;
  description: string;
  brand: BrandLogoName;
  placeholder?: string;
  helpUrl?: string;
  helpLabel?: string;
}[] = [
  {
    type: "linkedin_unipile",
    label: "LinkedIn (Unipile)",
    description:
      "Send LinkedIn messages and connection requests via Unipile API.",
    brand: "linkedin",
    placeholder: "Paste your Unipile API key",
    helpUrl: "https://docs.unipile.com/",
    helpLabel: "Unipile docs",
  },
  {
    type: "hubspot",
    label: "HubSpot CRM",
    description: "Sync contacts, deals, and engagement data with HubSpot.",
    brand: "hubspot",
    placeholder: "Paste your HubSpot private app token",
    helpUrl: "https://developers.hubspot.com/docs/api/private-apps",
    helpLabel: "HubSpot private apps guide",
  },
  {
    type: "salesforce",
    label: "Salesforce CRM",
    description: "Push leads and sync pipeline data with Salesforce.",
    brand: "salesforce",
    placeholder: "Paste your Salesforce API token",
    helpUrl: "https://help.salesforce.com/s/articleView?id=sf.user_security_token.htm",
    helpLabel: "Salesforce token guide",
  },
  {
    type: "apollo",
    label: "Apollo.io",
    description:
      "Enrich leads and find verified contact information with Apollo.",
    brand: "apollo",
    placeholder: "Paste your Apollo API key",
    helpUrl: "https://apolloio.github.io/apollo-api-docs/",
    helpLabel: "Apollo API docs",
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

  const twilioIntegration = userIntegrations.find((i) => i.type === "twilio");
  const twilioConnected = !!(twilioIntegration?.accessToken);

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
          <TwilioForm
            initialConnected={twilioConnected}
            initialAccountSid={twilioIntegration?.accountEmail ?? undefined}
          />

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
          {CRM_INTEGRATIONS.map((crm) => (
            <ApiKeyIntegrationForm
              key={crm.type}
              type={crm.type}
              label={crm.label}
              description={crm.description}
              brand={crm.brand}
              initialConnected={connectedTypes.has(crm.type)}
              placeholder={crm.placeholder}
              helpUrl={crm.helpUrl}
              helpLabel={crm.helpLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
