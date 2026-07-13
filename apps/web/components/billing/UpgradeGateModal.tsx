"use client";

import { X, Zap, Check } from "lucide-react";

const GATE_FEATURES: Record<string, { title: string; description: string; minPlan: string }> = {
  campaigns: {
    title: "Upgrade to run campaigns",
    description:
      "The Free plan lets you explore the platform and search leads. To send emails, run sequences, and enroll leads into campaigns, upgrade to Starter or Growth.",
    minPlan: "Starter",
  },
  sequences: {
    title: "Upgrade to use sequences",
    description:
      "Multi-step sequences are available on Starter and Growth plans. Upgrade to automate follow-ups and scale your outreach.",
    minPlan: "Starter",
  },
  emails: {
    title: "Upgrade to send emails",
    description:
      "Email sending is not available on the Free plan. Upgrade to Starter or Growth to start your outbound motion.",
    minPlan: "Starter",
  },
};

const UPGRADE_HIGHLIGHTS = [
  "5,000 credits/month on Starter",
  "Unlimited campaigns",
  "Gmail & WhatsApp integration",
  "Automated reply handling",
];

interface Props {
  feature?: keyof typeof GATE_FEATURES;
  onClose: () => void;
  onUpgrade: () => void;
}

export function UpgradeGateModal({ feature = "campaigns", onClose, onUpgrade }: Props) {
  const gate = GATE_FEATURES[feature] ?? GATE_FEATURES.campaigns;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
              <Zap className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">{gate.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">{gate.description}</p>

          <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 space-y-2">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
              What you unlock
            </p>
            {UPGRADE_HIGHLIGHTS.map((h) => (
              <div key={h} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                <span className="text-sm text-gray-700">{h}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onUpgrade();
              }}
              className="flex-1 h-10 rounded-lg bg-[#6C47FF] text-white text-sm font-semibold hover:bg-[#5538DD] transition-colors"
            >
              See plans â†’
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
