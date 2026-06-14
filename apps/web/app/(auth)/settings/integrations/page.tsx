"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Cloud, X, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Integration Connect Modal                                          */
/* ------------------------------------------------------------------ */
function IntegrationModal({
  title,
  description,
  inputLabel,
  inputPlaceholder,
  connectLabel,
  oauthLabel,
  onClose,
  onConnect,
}: {
  title: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  connectLabel: string;
  oauthLabel?: string;
  onClose: () => void;
  onConnect: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    if (!inputValue.trim()) {
      toast.error(`Please enter your ${inputLabel.toLowerCase()}`);
      return;
    }
    setConnecting(true);
    setTimeout(() => {
      onConnect();
      setConnecting(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{description}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{inputLabel}</label>
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
              placeholder={inputPlaceholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          {oauthLabel && (
            <button
              onClick={handleConnect}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              {oauthLabel}
            </button>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {connecting ? "Connecting..." : connectLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Integration Card                                                   */
/* ------------------------------------------------------------------ */
function IntegrationCard({
  icon,
  title,
  description,
  connected,
  onConnect,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-4">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      {connected ? (
        <span className="shrink-0 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200 cursor-default">
          Connected
        </span>
      ) : (
        <button
          onClick={onConnect}
          className="shrink-0 px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Integrations Page                                                  */
/* ------------------------------------------------------------------ */
export default function IntegrationsPage() {
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [salesforceConnected, setSalesforceConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  const [showModal, setShowModal] = useState<"hubspot" | "salesforce" | "slack" | null>(null);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
      </div>

      {/* CRM */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">CRM</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            icon={
              <div className="h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                H
              </div>
            }
            title="HubSpot"
            description="Sync contacts and deals with your HubSpot CRM"
            connected={hubspotConnected}
            onConnect={() => setShowModal("hubspot")}
          />
          <IntegrationCard
            icon={
              <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Cloud className="h-5 w-5 text-white" />
              </div>
            }
            title="Salesforce"
            description="Connect your Salesforce account for lead management"
            connected={salesforceConnected}
            onConnect={() => setShowModal("salesforce")}
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
            connected={slackConnected}
            onConnect={() => setShowModal("slack")}
          />
        </div>
      </div>

      {/* Modals */}
      {showModal === "hubspot" && (
        <IntegrationModal
          title="Connect HubSpot CRM"
          description="Sync contacts, deals and activities with HubSpot CRM."
          inputLabel="API Key"
          inputPlaceholder="Enter your HubSpot API key"
          connectLabel="Connect"
          oauthLabel="Or connect with OAuth"
          onClose={() => setShowModal(null)}
          onConnect={() => {
            setHubspotConnected(true);
            setShowModal(null);
            toast.success("HubSpot connected!");
          }}
        />
      )}
      {showModal === "salesforce" && (
        <IntegrationModal
          title="Connect Salesforce CRM"
          description="Sync contacts, leads and opportunities with Salesforce CRM."
          inputLabel="API Key"
          inputPlaceholder="Enter your Salesforce API key"
          connectLabel="Connect"
          oauthLabel="Or connect with OAuth"
          onClose={() => setShowModal(null)}
          onConnect={() => {
            setSalesforceConnected(true);
            setShowModal(null);
            toast.success("Salesforce connected!");
          }}
        />
      )}
      {showModal === "slack" && (
        <IntegrationModal
          title="Connect Slack workspace"
          description="Get notifications and updates in your Slack workspace."
          inputLabel="Workspace URL"
          inputPlaceholder="your-workspace.slack.com"
          connectLabel="Connect with Slack"
          onClose={() => setShowModal(null)}
          onConnect={() => {
            setSlackConnected(true);
            setShowModal(null);
            toast.success("Slack connected!");
          }}
        />
      )}
    </div>
  );
}
