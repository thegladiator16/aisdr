"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, Check, ArrowLeft } from "lucide-react";

type Reason =
  | "too_expensive"
  | "not_enough_value"
  | "missing_feature"
  | "switching"
  | "taking_break";

interface Props {
  onClose: () => void;
  onCancelConfirmed: () => Promise<void>;
  planName: string;
}

const REASONS: { id: Reason; label: string }[] = [
  { id: "too_expensive", label: "Too expensive" },
  { id: "not_enough_value", label: "Not getting enough value" },
  { id: "missing_feature", label: "Missing a feature I need" },
  { id: "switching", label: "Switching to another tool" },
  { id: "taking_break", label: "Taking a break" },
];

const COLORS = {
  primary: "#111827",
  secondary: "#6B7280",
  accent: "#6C47FF",
  border: "#E5E7EB",
  error: "#EF4444",
};

export default function CancellationFlowModal({
  onClose,
  onCancelConfirmed,
  planName,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<Reason | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slide = {
    initial: { x: 24, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -24, opacity: 0 },
    transition: { duration: 0.2 },
  };

  const handleConfirmCancel = async () => {
    setSubmitting(true);
    try {
      await onCancelConfirmed();
      toast.success("Your subscription has been cancelled");
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again or contact support.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderOffer = () => {
    switch (reason) {
      case "too_expensive":
        return {
          title: "How about 20% off for 3 months?",
          body: "We would love to keep you. Apply an instant discount to your next 3 billing cycles.",
          primaryLabel: "Claim my discount",
          onPrimary: () => {
            toast.success("Discount applied, thank you for staying");
            onClose();
          },
          extra: null as React.ReactNode,
        };
      case "not_enough_value":
        return {
          title: "Let us help, book a free setup call",
          body: "One of our specialists will walk you through the features that best fit your workflow.",
          primaryLabel: "Book a setup call",
          onPrimary: () => {
            window.location.href =
              "mailto:support@aryasdr.in?subject=Free%20setup%20call%20request";
          },
          extra: null,
        };
      case "missing_feature":
        return {
          title: "We are actively building it",
          body: "Stay for 30 days free while we ship the features you need.",
          primaryLabel: "Extend my trial 30 days",
          onPrimary: () => {
            toast.success("Trial extended by 30 days");
            onClose();
          },
          extra: null,
        };
      case "switching":
        return {
          title: "What would it take to keep you?",
          body: "Tell us what the other tool does better — your feedback goes straight to our product team.",
          primaryLabel: "Send feedback",
          onPrimary: () => {
            toast.success("Thanks, sent to product team");
            onClose();
          },
          extra: (
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What would it take?"
              className="mt-4 w-full min-h-[96px] rounded-lg border p-3 text-sm outline-none focus:border-[#6C47FF]"
              style={{ borderColor: COLORS.border, color: COLORS.primary }}
            />
          ),
        };
      case "taking_break":
        return {
          title: "Pause your subscription for up to 3 months",
          body: "Keep your data and settings — resume anytime with a single click.",
          primaryLabel: "Pause subscription",
          onPrimary: () => {
            toast.success("Subscription paused for 3 months");
            onClose();
          },
          extra: null,
        };
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ color: COLORS.primary }}
      >
        <div
          className="flex items-center justify-between px-6 pt-5 pb-3 border-b"
          style={{ borderColor: COLORS.border }}
        >
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className="h-2 w-2 rounded-full transition-colors"
                style={{
                  backgroundColor: s <= step ? COLORS.accent : COLORS.border,
                }}
              />
            ))}
            <span
              className="ml-2 text-xs"
              style={{ color: COLORS.secondary }}
            >
              Step {step} of 3
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} style={{ color: COLORS.secondary }} />
          </button>
        </div>

        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" {...slide}>
                <h2 className="text-xl font-semibold">
                  We are sorry to see you go
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: COLORS.secondary }}
                >
                  Why are you leaving {planName}?
                </p>

                <div className="mt-5 flex flex-col gap-2">
                  {REASONS.map((r) => {
                    const active = reason === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setReason(r.id)}
                        className="flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all"
                        style={{
                          borderColor: active ? COLORS.accent : COLORS.border,
                          borderWidth: active ? 2 : 1,
                          backgroundColor: active ? "#F5F3FF" : "white",
                        }}
                      >
                        <span>{r.label}</span>
                        {active && (
                          <Check size={16} style={{ color: COLORS.accent }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    onClick={onClose}
                    className="text-sm font-medium"
                    style={{ color: COLORS.secondary }}
                  >
                    Nevermind, keep my plan
                  </button>
                  <button
                    disabled={!reason}
                    onClick={() => setStep(2)}
                    className="rounded-full px-6 py-2 text-sm font-medium text-white disabled:opacity-40"
                    style={{ backgroundColor: COLORS.accent }}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && reason && (
              <motion.div key="s2" {...slide}>
                {(() => {
                  const offer = renderOffer();
                  if (!offer) return null;
                  return (
                    <>
                      <h2 className="text-xl font-semibold">{offer.title}</h2>
                      <p
                        className="mt-2 text-sm"
                        style={{ color: COLORS.secondary }}
                      >
                        {offer.body}
                      </p>
                      {offer.extra}
                      <div className="mt-6 flex items-center justify-between gap-3">
                        <button
                          onClick={() => setStep(3)}
                          className="text-sm font-medium"
                          style={{ color: COLORS.secondary }}
                        >
                          No thanks, cancel anyway
                        </button>
                        <button
                          onClick={offer.onPrimary}
                          className="rounded-full px-6 py-2 text-sm font-medium text-white"
                          style={{ backgroundColor: COLORS.accent }}
                        >
                          {offer.primaryLabel}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" {...slide}>
                <h2 className="text-xl font-semibold">
                  Cancel your subscription?
                </h2>
                <p
                  className="mt-2 text-sm"
                  style={{ color: COLORS.secondary }}
                >
                  Here is what happens if you cancel:
                </p>
                <ul
                  className="mt-4 space-y-2 text-sm"
                  style={{ color: COLORS.primary }}
                >
                  <li className="flex gap-2">
                    <span style={{ color: COLORS.error }}>-</span>
                    Your active campaigns will be paused
                  </li>
                  <li className="flex gap-2">
                    <span style={{ color: COLORS.error }}>-</span>
                    You will no longer receive monthly credits
                  </li>
                  <li className="flex gap-2">
                    <span style={{ color: COLORS.error }}>-</span>
                    Your data is retained for 30 days, then deleted
                  </li>
                </ul>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 text-sm font-medium"
                    style={{ color: COLORS.secondary }}
                  >
                    <ArrowLeft size={14} />
                    Go back to save offer
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleConfirmCancel}
                    className="rounded-full px-6 py-2 text-sm font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: COLORS.error }}
                  >
                    {submitting ? "Cancelling..." : "Yes, cancel"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
