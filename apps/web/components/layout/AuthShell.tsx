"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatWithArya } from "@/components/ChatWithArya";
import { WelcomeModal } from "@/components/WelcomeModal";
import { X } from "lucide-react";
import Link from "next/link";
import { ChangePlanModal } from "@/components/billing/ChangePlanModal";

function UpgradeBanner({ onDismiss, onChoosePlan }: { onDismiss: () => void; onChoosePlan: () => void }) {
  return (
    <div
      className="w-full py-2.5 px-4 text-sm text-white text-center flex items-center justify-center gap-4"
      style={{
        background: "linear-gradient(to right, #FBC2EB, #A18CD1)",
      }}
    >
      <span>
        Your trial ends in 30 days. You can reach 1,000s more people if you
        upgrade today
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onChoosePlan}
          className="rounded-full border border-white px-3 py-1 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          Choose plan
        </button>
        <button
          onClick={onDismiss}
          className="text-xs hover:underline opacity-80"
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("arya_banner_dismissed");
    if (!dismissed) setShowBanner(true);
    const welcomed = localStorage.getItem("arya_welcomed");
    if (!welcomed) setShowWelcome(true);
  }, []);

  function dismissBanner() {
    setShowBanner(false);
    localStorage.setItem("arya_banner_dismissed", "true");
  }

  function dismissWelcome() {
    setShowWelcome(false);
    localStorage.setItem("arya_welcomed", "true");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8F9FA]">
      {showBanner && <UpgradeBanner onDismiss={dismissBanner} onChoosePlan={() => setShowPlanModal(true)} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onChatOpen={() => setChatOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
        {chatOpen && <ChatWithArya onClose={() => setChatOpen(false)} />}
      </div>
      {showPlanModal && <ChangePlanModal onClose={() => setShowPlanModal(false)} />}
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
    </div>
  );
}
