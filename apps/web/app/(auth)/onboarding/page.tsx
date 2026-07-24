"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

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
  targetJobTitle: string;
  location: string;
  campaignName: string;
  gmailConnected: boolean;
  gmailEmail: string;
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

const ROLES = [
  "Founder / CEO",
  "Head of Sales",
  "Sales Manager",
  "SDR / BDR",
  "Account Executive",
  "Marketing",
  "Other",
];

const STEP_TITLES = [
  "Tell us about you",
  "Connect your mailbox",
  "Define your ICP",
  "Launch your first campaign",
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    companyName: "",
    industry: "SaaS / Software",
    targetMarket: "",
    companySize: "11-50",
    role: "Founder / CEO",
    tone: "Professional",
    channels: ["Email"],
    dailyLimit: 30,
    targetJobTitle: "",
    location: "",
    campaignName: "",
    gmailConnected: false,
    gmailEmail: "",
  });

  /* Prefill from Clerk user data. */
  useEffect(() => {
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
      companyName: d.companyName || guessedCompany,
      campaignName: d.campaignName || (guessedCompany ? `${guessedCompany} — Q1 outbound` : ""),
    }));
  }, [user]);

  /* Detect Gmail OAuth return via URL params */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      const em =
        params.get("email") ??
        user?.primaryEmailAddress?.emailAddress ??
        "";
      setData((d) => ({ ...d, gmailConnected: true, gmailEmail: em }));
      setStep(1);
    }
  }, [user]);

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
    if (step === 0) return !!(data.role && data.companySize);
    if (step === 1) return true; // mailbox is optional
    if (step === 2) return !!data.industry;
    if (step === 3) return !!data.campaignName.trim();
    return true;
  };

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };
  const goSkip = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleConnectGmail = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/v1/integrations/gmail";
    }
  };

  const handleLaunch = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        toast.error("Could not save your setup. Please try again.");
        setSubmitting(false);
        return;
      }
      // Seed dashboard checklist so the newly-launched user sees a guided next-step list.
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "dashboard.checklist",
            JSON.stringify({
              seededAt: new Date().toISOString(),
              items: [
                { id: "mailbox", label: "Connect your mailbox", done: data.gmailConnected },
                { id: "icp", label: "Review your ICP", done: false },
                { id: "campaign", label: `Review "${data.campaignName}" campaign`, done: false },
                { id: "first-send", label: "Approve your first sequence", done: false },
              ],
            })
          );
        }
      } catch {
        // ignore storage failure — server has the source of truth
      }
      router.push("/dashboard");
    } catch {
      toast.error("Could not save your setup. Please try again.");
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Step renderers                                                   */
  /* ---------------------------------------------------------------- */

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-transparent transition";
  const labelClass =
    "text-xs font-medium uppercase tracking-wider text-gray-500";

  const renderStep0 = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
          Tell us about you
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Two quick answers so Arya can tune outreach to how you sell.
        </p>
      </div>

      <div className="grid gap-5">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Your role</span>
          <select
            className={inputClass}
            value={data.role}
            onChange={(e) => updateField("role", e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelClass}>Company size</span>
          <select
            className={inputClass}
            value={data.companySize}
            onChange={(e) => updateField("companySize", e.target.value)}
          >
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} employees
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
          Connect your mailbox
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Arya sends from your Gmail so replies land in your inbox and your
          deliverability compounds.
        </p>
      </div>

      {data.gmailConnected ? (
        <div className="flex items-start gap-4 rounded-2xl border border-[#10B981]/30 bg-[#10B981]/5 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10B981]/15">
            <svg
              className="h-5 w-5 text-[#10B981]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Mailbox connected</p>
            <p className="mt-1 text-sm text-gray-600 tabular-nums">
              {data.gmailEmail || "Gmail account linked"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={handleConnectGmail}
            className="inline-flex items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.68 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4c1.94 0 3.24.83 3.98 1.54l2.72-2.62A9.8 9.8 0 0 0 12 2a10 10 0 1 0 0 20c5.77 0 9.6-4.05 9.6-9.76 0-.66-.07-1.16-.16-1.66H12z" />
            </svg>
            Connect Gmail
          </button>
          <p className="text-sm text-gray-500">
            You can also skip this and hook up your mailbox from Settings later.
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
          Define your ICP
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Tell Arya who to prospect. You can refine this any time.
        </p>
      </div>

      <div className="grid gap-5">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Industry</span>
          <select
            className={inputClass}
            value={data.industry}
            onChange={(e) => updateField("industry", e.target.value)}
          >
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelClass}>Target job title</span>
          <input
            className={inputClass}
            value={data.targetJobTitle}
            onChange={(e) => updateField("targetJobTitle", e.target.value)}
            placeholder="e.g. VP of Sales, Head of Growth"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className={labelClass}>Location</span>
          <input
            className={inputClass}
            value={data.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="e.g. United States, London, EMEA"
          />
        </label>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
          Launch your first campaign
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Give this campaign a name. Arya will draft a first sequence for the ICP
          below.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Campaign name</span>
        <input
          className={inputClass}
          value={data.campaignName}
          onChange={(e) => updateField("campaignName", e.target.value)}
          placeholder="Q1 outbound to SaaS founders"
        />
      </label>

      <div className="mt-6 rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
        <p className={`${labelClass} mb-3`}>Confirm your ICP</p>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Industry</dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {data.industry || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Job title</dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {data.targetJobTitle || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Location</dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {data.location || "—"}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Nothing sends until you approve it. Arya will draft, you review.
      </p>
    </div>
  );

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3];
  const progressPct = ((step + 1) / steps.length) * 100;

  const slideVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : dir * 32,
    }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : dir * -32,
    }),
  };

  /* ---------------------------------------------------------------- */
  /*  Layout                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-3">
          <AryaAvatar size="sm" />
          <div>
            <p className="text-sm font-medium text-gray-900">Arya</p>
            <p className="text-xs text-gray-500">Your AI SDR</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full rounded-full bg-[#6C47FF]"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.6,
                ease: EASE,
              }}
            />
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 tabular-nums">
                Step {step + 1} of {steps.length}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {STEP_TITLES[step]} · Takes about 3 minutes
              </p>
            </div>
            {step < steps.length - 1 && (
              <button
                type="button"
                onClick={goSkip}
                className="text-sm text-gray-500 transition hover:text-gray-900"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>

        {/* Step content */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: prefersReducedMotion ? 0 : 0.5,
                ease: EASE,
              }}
            >
              {steps[step]()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="rounded-full border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-0"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="rounded-full bg-[#6C47FF] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#5835E8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              disabled={submitting || !canProceed()}
              className="rounded-full bg-[#6C47FF] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#5835E8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Launching..." : "Launch campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
