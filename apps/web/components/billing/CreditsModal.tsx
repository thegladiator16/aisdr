"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { X, Minus, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useSubscription } from "@/lib/hooks/useSubscription";
import type { SubscriptionData } from "@/lib/hooks/useSubscription";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatRenewalDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function barColor(remainingPct: number): string {
  if (remainingPct > 50) return "bg-violet-500";
  if (remainingPct > 20) return "bg-amber-400";
  return "bg-red-500";
}

/* ---------- inner buy-credits flow ---------- */
function BuyFlow({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useUser();
  const { openCheckout } = useRazorpay();
  const [quantity, setQuantity] = useState(1000);
  const [processing, setProcessing] = useState(false);

  const pricePerCredit = 2.5;
  const GST = 0.18;
  const subtotal = Math.round(quantity * pricePerCredit);
  const tax = Math.round(subtotal * GST);
  const total = subtotal + tax;

  async function handlePay() {
    setProcessing(true);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credits", quantity }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.detail || d?.error || "Could not start payment.");
        return;
      }
      const { orderId, amount, currency, keyId } = await res.json();
      const result = await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        name: "AryaSDR",
        description: `${quantity.toLocaleString()} credits`,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName ?? undefined,
        },
        verifyBody: { type: "credits", quantity },
        onVerified: () => {
          toast.success(`${quantity.toLocaleString()} credits added!`);
          onSuccess();
          onClose();
        },
      });
      if (result.success === false && result.error && result.error !== "Cancelled by user") {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="pt-5 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-900 mb-3">Buy extra credits</p>

      {/* Quantity stepper */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setQuantity((q) => Math.max(1000, q - 1000))}
          className="h-8 w-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-base font-semibold text-gray-900 w-20 text-center tabular-nums">
          {quantity.toLocaleString()}
        </span>
        <button
          onClick={() => setQuantity((q) => q + 1000)}
          className="h-8 w-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-gray-400">₹{pricePerCredit.toFixed(2)} / credit</span>
      </div>

      {/* Price breakdown */}
      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm space-y-1.5 mb-4">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span><span>{formatINR(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>GST (18%)</span><span>{formatINR(tax)}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
          <span>Total</span><span>{formatINR(total)}</span>
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={processing}
        className="w-full h-10 rounded-lg bg-[#6C47FF] text-white text-sm font-semibold hover:bg-[#5538DD] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : `Pay ${formatINR(total)}`}
      </button>
    </div>
  );
}

/* ---------- main modal ---------- */
export function CreditsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: subscription, refresh } = useSubscription();
  const [buying, setBuying] = useState(false);

  const credits = subscription?.credits ?? 0;
  const creditsUsed = subscription?.creditsUsed ?? 0;
  const creditsRemaining = Math.max(0, credits - creditsUsed);
  const remainingPct = credits > 0 ? Math.round((creditsRemaining / credits) * 100) : 0;
  const renewalDate = formatRenewalDate(subscription?.currentPeriodEnd ?? null);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h2 className="text-base font-bold text-gray-900">Credits</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* Big count + renewal */}
          <div className="flex items-baseline justify-between mt-3 mb-2">
            <span className="text-4xl font-bold text-gray-900 tabular-nums">
              {creditsRemaining.toLocaleString()}
            </span>
            {renewalDate && (
              <span className="text-xs text-gray-400">Renews {renewalDate}</span>
            )}
          </div>

          {/* Colored depletion bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(remainingPct)}`}
              style={{ width: `${remainingPct}%` }}
            />
          </div>

          {/* Buttons */}
          {!buying ? (
            <div className="flex gap-3">
              <button
                onClick={() => setBuying(true)}
                className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Buy extra credits
              </button>
              <button
                onClick={() => { router.push("/settings/billing"); onClose(); }}
                className="flex-1 h-10 rounded-lg bg-[#6C47FF] text-white text-sm font-semibold hover:bg-[#5538DD] transition-colors"
              >
                Manage plan &amp; credits
              </button>
            </div>
          ) : (
            <BuyFlow
              onClose={onClose}
              onSuccess={() => { refresh(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
