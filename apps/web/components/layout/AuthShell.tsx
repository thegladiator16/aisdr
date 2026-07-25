"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { X } from "lucide-react";
import { useSubscription } from "@/lib/hooks/useSubscription";

const ChatWithArya = dynamic(
  () => import("@/components/ChatWithArya").then((m) => m.ChatWithArya),
  { ssr: false }
);
const AryaChatWidget = dynamic(
  () => import("@/components/arya/AryaChatWidget").then((m) => m.AryaChatWidget),
  { ssr: false }
);
const WelcomeModal = dynamic(
  () => import("@/components/WelcomeModal").then((m) => m.WelcomeModal),
  { ssr: false }
);
const ChangePlanModal = dynamic(
  () => import("@/components/billing/ChangePlanModal").then((m) => m.ChangePlanModal),
  { ssr: false }
);

function UpgradeBanner({
  daysLeft,
  isTrialing,
  onDismiss,
  onChoosePlan,
}: {
  daysLeft: number | null;
  isTrialing: boolean;
  onDismiss: () => void;
  onChoosePlan: () => void;
}) {
  const days = daysLeft ?? 0;
  const message = isTrialing
    ? `Your trial ends in ${days} day${days !== 1 ? "s" : ""}. Upgrade to a paid plan today`
    : "You can reach 1,000s of more people if you upgrade today";

  return (
    <div
      className="relative z-[5] w-full py-2.5 px-4 text-sm text-white text-center flex items-center justify-center gap-4"
      style={{
        background: "linear-gradient(90deg, #7C3AED, #A855F7, #EC4899, #F97316)",
      }}
    >
      <span>{message}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onChoosePlan}
          className="rounded-full border border-white px-3 py-1 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          Choose plan
        </button>
        <button
          onClick={onDismiss}
          className="rounded-full border border-white px-3 py-1 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const { data: subscription } = useSubscription();

  const tier = subscription?.tier;
  const isTrialing = subscription?.isTrialing ?? false;
  const daysLeft = subscription?.daysLeft ?? null;
  const bannerAllowedForTier =
    !tier || tier === "trial" || tier === "free";

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
      {showBanner && bannerAllowedForTier && (
        <UpgradeBanner
          daysLeft={daysLeft}
          isTrialing={isTrialing}
          onDismiss={dismissBanner}
          onChoosePlan={() => setShowPlanModal(true)}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onChatOpen={() => setChatOpen(true)} />
        {pathname.startsWith("/settings") ? (
          <main className="flex-1 overflow-hidden">
            <Suspense>
              <div key={pathname} className="h-full animate-in fade-in slide-in-from-top-1 duration-150">
                {children}
              </div>
            </Suspense>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto">
            <Suspense>
              <div key={pathname} className="mx-auto max-w-7xl p-6 animate-in fade-in slide-in-from-top-1 duration-150">
                {children}
              </div>
            </Suspense>
          </main>
        )}
        {chatOpen && <ChatWithArya onClose={() => setChatOpen(false)} />}
      </div>
      {showPlanModal && <ChangePlanModal onClose={() => setShowPlanModal(false)} />}
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
      <AryaChatWidget visible={!chatOpen} />
    </div>
  );
}
