"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Clock,
  X,
  Minus,
  Plus,
  Check,
  Loader2,
  Lock,
  AlertTriangle,
  Zap,
  Shield,
  Users,
  BarChart3,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { useRazorpay } from "@/hooks/useRazorpay";
import { cn } from "@/lib/utils";

const tabs = ["Ready to call", "Upcoming", "Call log"] as const;
type Tab = (typeof tabs)[number];

const FEATURES = [
  {
    icon: Zap,
    title: "Live AI talking points",
    desc: "Arya surfaces real-time suggestions during the call based on the lead's profile.",
  },
  {
    icon: Users,
    title: "Past interaction summary",
    desc: "See every email, reply, and note before you dial, no prep time needed.",
  },
  {
    icon: BarChart3,
    title: "Call outcome tracking",
    desc: "Log outcomes instantly. Arya auto-updates the CRM and suggests next steps.",
  },
  {
    icon: Shield,
    title: "Local presence calling",
    desc: "Show local numbers to improve answer rates by up to 4×.",
  },
];

export default function DialerPage() {
  const router = useRouter();
  const { user } = useUser();
  const { openCheckout } = useRazorpay();
  const [activeTab, setActiveTab] = useState<Tab>("Ready to call");
  const [dialerModalOpen, setDialerModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [paymentsAvailable, setPaymentsAvailable] = useState<boolean | null>(null);

  const unitPrice = 6299;
  const GST_RATE = 0.18;
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * GST_RATE);
  const total = subtotal + tax;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => setPaymentsAvailable(d.paymentsAvailable ?? false))
      .catch(() => setPaymentsAvailable(false));
  }, []);

  const resetState = () => {
    setPurchasing(false);
    setPurchaseSuccess(false);
    setQuantity(1);
  };

  const handlePurchase = async () => {
    if (!paymentsAvailable) {
      toast.error("Payments not configured. Contact your administrator.");
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dialer", quantity }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json?.code === "PAYMENTS_NOT_CONFIGURED"
            ? "Payments aren't set up yet. Contact your administrator."
            : json?.error ?? "Could not start payment. Please try again.";
        toast.error(msg);
        return;
      }
      const { orderId, amount, currency, keyId } = json;
      const result = await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        name: "AryaSDR",
        description: `${quantity} dialer seat${quantity > 1 ? "s" : ""}`,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName ?? undefined,
        },
        verifyBody: { type: "dialer", quantity },
        onVerified: () => {
          toast.success(`Purchased ${quantity} dialer seat${quantity > 1 ? "s" : ""}`);
          setPurchaseSuccess(true);
          setTimeout(() => {
            setDialerModalOpen(false);
            resetState();
            router.refresh();
          }, 1500);
        },
      });
      if (result.success === false && result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const closeModal = () => {
    setDialerModalOpen(false);
    resetState();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dialer</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-assisted calling with live talking points and outcome tracking
          </p>
        </div>
        <button
          onClick={() => setDialerModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5538DD] transition-colors"
        >
          <Phone className="h-4 w-4" />
          Buy seats
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab
                  ? "text-[#6C47FF]"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6C47FF] rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "Ready to call" && (
        <div className="space-y-6">
          {/* Hero CTA card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#6C47FF] to-[#9B7DFF] p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
              <div className="h-64 w-64 rounded-full bg-white absolute -right-20 -top-20" />
              <div className="h-40 w-40 rounded-full bg-white absolute -right-5 bottom-10" />
            </div>
            <div className="relative z-10 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium mb-4">
                <PlayCircle className="h-3.5 w-3.5" />
                AI-Powered Calling
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Close more deals with AI-assisted calls
              </h2>
              <p className="text-violet-100 text-sm leading-relaxed mb-6">
                Arya listens in real-time and surfaces the perfect talking points, objection handlers, and competitor insights, right when you need them.
              </p>
              <button
                onClick={() => setDialerModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#6C47FF] hover:bg-violet-50 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Buy a dialer seat
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-[#6C47FF]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Integration note */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Telephony provider required</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Placing real calls requires a connected telephony provider (e.g. Twilio). Seat purchases are real, but dialing won&apos;t work until that integration is configured in Settings → Integrations.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Upcoming" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Clock className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No upcoming calls</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Scheduled calls will appear here. Buy a dialer seat to get started.
            </p>
            <button
              onClick={() => setDialerModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5538DD] transition-colors"
            >
              <Phone className="h-4 w-4" />
              Buy dialer seats
            </button>
          </div>
        </div>
      )}

      {activeTab === "Call log" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PhoneOff className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No call history yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Past calls with outcomes, recordings, and AI summaries will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {dialerModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <PhoneCall className="h-4 w-4 text-[#6C47FF]" />
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  Purchase dialer seat{quantity > 1 ? "s" : ""}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Payment not configured banner */}
            {paymentsAvailable === false && (
              <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Payments not configured.</span>{" "}
                  Add <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">RAZORPAY_KEY_ID</code> and{" "}
                  <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">RAZORPAY_KEY_SECRET</code> to your environment variables to enable purchases.
                </p>
              </div>
            )}

            {/* Success State */}
            {purchaseSuccess ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Purchase successful!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {quantity} dialer seat{quantity > 1 ? "s" : ""} added to your account.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row">
                  {/* LEFT: Order Summary */}
                  <div className="w-full md:w-2/5 bg-gray-50 p-6 border-b md:border-b-0 md:border-r border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Dialer Seats</h3>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6C47FF]">
                        Add-on
                      </span>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">Seats to add</label>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-bold text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Subtotal ({fmt(unitPrice)} × {quantity})
                        </span>
                        <span className="font-medium text-gray-900">{fmt(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">GST (18%)</span>
                        <span className="font-medium text-gray-900">{fmt(tax)}</span>
                      </div>
                      <hr className="border-gray-200" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-gray-900">{fmt(total)}</span>
                      </div>
                      <p className="text-xs text-gray-400">Billed monthly · Cancel anytime</p>
                    </div>
                  </div>

                  {/* RIGHT: Info */}
                  <div className="w-full md:w-3/5 p-6 space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Clicking below opens Razorpay&apos;s secure checkout. You can pay by card, UPI, or net banking.
                    </p>

                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                          Dialer seats require a Twilio (or equivalent) telephony integration to place real calls. The integration isn&apos;t configured yet. Purchases are real, but calling won&apos;t work until you set it up.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Lock className="h-3.5 w-3.5 text-gray-400" />
                        <span>Secured by 256-bit SSL encryption</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Powered by</span>
                        <span className="font-bold text-[#0E2A8C]">Razorpay</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="border-t border-gray-100 px-6 py-4">
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || paymentsAvailable === false}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6C47FF] px-5 text-sm font-semibold text-white hover:bg-[#5538DD] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : paymentsAvailable === false ? (
                      "Payments not configured"
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Pay {fmt(total)} securely
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
