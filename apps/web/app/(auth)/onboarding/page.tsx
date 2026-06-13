"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OnboardingData {
  companyName: string;
  industry: string;
  targetMarket: string;
  companySize: string;
  role: string;
  tone: "Professional" | "Friendly" | "Bold";
  channels: string[];
  dailyLimit: number;
}

const INDUSTRIES = [
  "SaaS / Software",
  "E-commerce",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Marketing / Advertising",
  "Consulting",
  "Real Estate",
  "Logistics",
  "Other",
];

const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

/* ------------------------------------------------------------------ */
/*  Chat messages per step                                             */
/* ------------------------------------------------------------------ */

const CHAT_MESSAGES: Record<number, { from: "arya" | "user"; text: string }[]> =
  {
    0: [
      {
        from: "arya",
        text: "Hey! I'm Arya, your AI SDR. Let me quickly research your company so I can personalize outreach for you.",
      },
      {
        from: "arya",
        text: "Hang tight -- I'm pulling info from the web right now...",
      },
    ],
    1: [
      {
        from: "arya",
        text: "Here's what I found! Please review and correct anything that's off.",
      },
      {
        from: "arya",
        text: "The more accurate this is, the better my outreach will be.",
      },
    ],
    2: [
      {
        from: "arya",
        text: "Great! Now let's set up your outreach style.",
      },
      {
        from: "arya",
        text: "I'll adapt my writing to match your preferred tone and channels.",
      },
    ],
    3: [
      {
        from: "arya",
        text: "You're all set! I'm ready to start generating leads and booking meetings for you.",
      },
      {
        from: "arya",
        text: "Let's crush it together!",
      },
    ],
  };

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [researchDone, setResearchDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    companyName: "",
    industry: "SaaS / Software",
    targetMarket: "",
    companySize: "11-50",
    role: "",
    tone: "Professional",
    channels: ["Email"],
    dailyLimit: 30,
  });

  /* Research simulation */
  useEffect(() => {
    if (step !== 0) return;
    setResearchDone(false);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.random() * 8 + 2;
      });
    }, 120);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      /* Pre-fill from Clerk user data */
      const orgName =
        user?.organizationMemberships?.[0]?.organization?.name ?? "";
      const email = user?.primaryEmailAddress?.emailAddress ?? "";
      const domain = email.split("@")[1] ?? "";
      const guessedCompany =
        orgName ||
        (domain && !["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(domain)
          ? domain.replace(/\.\w+$/, "").replace(/^\w/, (c) => c.toUpperCase())
          : "");

      setData((d) => ({
        ...d,
        companyName: guessedCompany || d.companyName,
        role: d.role || "Founder",
      }));
      setResearchDone(true);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [step, user]);

  /* Helpers */
  const updateField = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((d) => ({ ...d, [key]: value }));
    },
    []
  );

  const toggleChannel = useCallback((ch: string) => {
    setData((d) => {
      const has = d.channels.includes(ch);
      return {
        ...d,
        channels: has ? d.channels.filter((c) => c !== ch) : [...d.channels, ch],
      };
    });
  }, []);

  const canProceed = (): boolean => {
    if (step === 0) return researchDone;
    if (step === 1) return !!(data.companyName && data.industry && data.role);
    return true;
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.push("/dashboard");
    } catch {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step renderers                                                   */
  /* ---------------------------------------------------------------- */

  const renderResearch = () => (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
      <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-[#6C47FF] animate-spin"
          style={{ animationDuration: researchDone ? "0s" : "2s" }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="50 20"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">
        {researchDone ? "Research Complete!" : "Researching Your Company"}
      </h2>

      <p className="text-gray-500 text-center max-w-md">
        {researchDone
          ? "I've gathered some info. Let's verify it in the next step."
          : "Arya is researching your company across the web..."}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#6C47FF] transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-2 text-center">
          {researchDone ? "Done" : `${Math.round(Math.min(progress, 99))}%`}
          {!researchDone && (
            <span className="inline-flex ml-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          )}
        </p>
      </div>

      {researchDone && (
        <div className="w-full max-w-md bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-sm font-medium text-[#6C47FF]">Discovered Info</p>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Company:</span>{" "}
              {data.companyName || "Not detected"}
            </p>
            <p>
              <span className="font-medium">Industry:</span> {data.industry}
            </p>
            <p>
              <span className="font-medium">Role:</span> {data.role || "Founder"}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderConfirm = () => (
    <div className="flex flex-col gap-5 px-8 py-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Confirm Your Details</h2>
      <p className="text-gray-500 text-sm -mt-2">
        We'll use this to personalize every outreach message.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Company Name *</span>
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-transparent"
          value={data.companyName}
          onChange={(e) => updateField("companyName", e.target.value)}
          placeholder="Acme Inc."
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Industry *</span>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-transparent bg-white"
          value={data.industry}
          onChange={(e) => updateField("industry", e.target.value)}
        >
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Target Market</span>
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-transparent"
          value={data.targetMarket}
          onChange={(e) => updateField("targetMarket", e.target.value)}
          placeholder="e.g. B2B SaaS startups in North America"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Company Size</span>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-transparent bg-white"
          value={data.companySize}
          onChange={(e) => updateField("companySize", e.target.value)}
        >
          {COMPANY_SIZES.map((s) => (
            <option key={s} value={s}>{s} employees</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Your Role *</span>
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-transparent"
          value={data.role}
          onChange={(e) => updateField("role", e.target.value)}
          placeholder="e.g. CEO, Head of Sales"
        />
      </label>
    </div>
  );

  const renderOutreach = () => (
    <div className="flex flex-col gap-6 px-8 py-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Outreach Preferences</h2>
      <p className="text-gray-500 text-sm -mt-2">
        Configure how Arya reaches out on your behalf.
      </p>

      {/* Tone */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Outreach Tone</span>
        <div className="grid grid-cols-3 gap-3">
          {(["Professional", "Friendly", "Bold"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateField("tone", t)}
              className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                data.tone === t
                  ? "border-[#6C47FF] bg-violet-50 text-[#6C47FF]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Channels</span>
        <div className="flex gap-3">
          {["Email", "LinkedIn", "WhatsApp"].map((ch) => (
            <label
              key={ch}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={data.channels.includes(ch)}
                onChange={() => toggleChannel(ch)}
                className="w-4 h-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
              />
              <span className="text-sm text-gray-700">{ch}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Daily limit slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Daily Send Limit
          </span>
          <span className="text-sm font-bold text-[#6C47FF]">
            {data.dailyLimit}
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={data.dailyLimit}
          onChange={(e) => updateField("dailyLimit", Number(e.target.value))}
          className="w-full accent-[#6C47FF]"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>10</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );

  const renderActivation = () => (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      {/* Confetti-style dots */}
      <div className="relative w-40 h-40">
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * 360;
          const distance = 50 + Math.random() * 30;
          const size = 4 + Math.random() * 6;
          const colors = ["#6C47FF", "#A78BFA", "#C4B5FD", "#EDE9FE", "#F59E0B", "#10B981"];
          return (
            <span
              key={i}
              className="absolute rounded-full animate-ping"
              style={{
                width: size,
                height: size,
                backgroundColor: colors[i % colors.length],
                left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * distance}px)`,
                top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * distance}px)`,
                animationDelay: `${i * 100}ms`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            />
          );
        })}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-gray-900">Arya is Ready!</h2>
      <p className="text-gray-500 max-w-md">
        Your AI SDR is fully configured and ready to start generating leads,
        crafting personalized outreach, and booking meetings on your behalf.
      </p>

      <button
        onClick={handleComplete}
        disabled={submitting}
        className="mt-4 px-8 py-3 rounded-xl bg-[#6C47FF] text-white font-semibold text-base hover:bg-[#5A38DD] transition-colors disabled:opacity-60"
      >
        {submitting ? "Setting up..." : "Go to Dashboard"}
      </button>
    </div>
  );

  const STEPS = [renderResearch, renderConfirm, renderOutreach, renderActivation];
  const STEP_LABELS = ["Research", "Details", "Outreach", "Activation"];

  /* ---------------------------------------------------------------- */
  /*  Layout                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-50 flex bg-[#FAFAFA]">
      {/* ---- Left: Arya chat panel ---- */}
      <div className="hidden md:flex w-[40%] flex-col bg-gradient-to-br from-[#6C47FF] to-[#4F35CC] text-white">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6">
          <AryaAvatar size="xl" animated />
          <h3 className="mt-4 text-xl font-bold">Arya</h3>
          <p className="text-sm text-violet-200">Your AI SDR Agent</p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {(CHAT_MESSAGES[step] ?? []).map((msg, i) => (
            <div
              key={`${step}-${i}`}
              className={`flex ${msg.from === "arya" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2 ${
                  msg.from === "arya"
                    ? "bg-white/15 text-white"
                    : "bg-white/25 text-white"
                }`}
                style={{ animationDelay: `${i * 400}ms`, animationFillMode: "both" }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Step counter */}
        <div className="px-6 py-4 border-t border-white/10 text-sm text-violet-200">
          Step {step + 1} of {STEPS.length}
        </div>
      </div>

      {/* ---- Right: Step content ---- */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 pt-8 pb-4">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === step
                    ? "bg-[#6C47FF]"
                    : i < step
                    ? "bg-[#6C47FF]/40"
                    : "bg-gray-300"
                }`}
              />
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  i === step ? "text-[#6C47FF]" : "text-gray-400"
                }`}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    i < step ? "bg-[#6C47FF]/40" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{STEPS[step]()}</div>

        {/* Navigation */}
        {step < 3 && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-gray-200 bg-white">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none"
            >
              Back
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#6C47FF] text-white hover:bg-[#5A38DD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
