"use client";

import { Cloud } from "lucide-react";

function IntegrationCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-4">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <button className="shrink-0 px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors">
        Connect
      </button>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
      </div>

      {/* CRM */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          CRM
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            icon={
              <div className="h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                H
              </div>
            }
            title="HubSpot"
            description="Sync contacts and deals with your HubSpot CRM"
          />
          <IntegrationCard
            icon={
              <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Cloud className="h-5 w-5 text-white" />
              </div>
            }
            title="Salesforce"
            description="Connect your Salesforce account for lead management"
          />
        </div>
      </div>

      {/* Communication */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Communication
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            icon={
              <div className="h-10 w-10 bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                #
              </div>
            }
            title="Slack"
            description="Get real-time notifications and updates in your Slack workspace"
          />
        </div>
      </div>
    </div>
  );
}
