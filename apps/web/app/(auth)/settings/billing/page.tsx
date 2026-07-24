"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import {
  Download,
  Minus,
  Plus,
  X,
  Lock,
  CreditCard,
  Smartphone,
  Loader2,
} from "lucide-react";
import { ChangePlanModal } from "@/components/billing/ChangePlanModal";
import CancellationFlowModal from "@/components/billing/CancellationFlowModal";
import { CardBrandLogo, type CardBrand } from "@/components/brand/CardBrandLogo";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useSubscription } from "@/lib/hooks/useSubscription";
import {
  resolveCurrency,
  fetchGeoIsIndia,
  formatMoney as formatCurrencyMoney,
  inrToUsdDisplay,
  type Currency as PrefCurrency,
} from "@/lib/payments/currency";

type OtherCost = {
  label: string;
  quantity: number;
  unitPrice: number;
  unitLabel: string;
  type: "mailbox" | "dialer" | "phone";
};

/* ------------------------------------------------------------------ */
/*  Buy Credits Modal                                                  */
/* ------------------------------------------------------------------ */
function BuyCreditsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useUser();
  const { openCheckout } = useRazorpay();
  const [quantity, setQuantity] = useState(1000);
  const [tab, setTab] = useState<"card" | "upi">("card");
  const [processing, setProcessing] = useState(false);
  const [paymentsAvailable, setPaymentsAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/billing/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setPaymentsAvailable(!!j?.paymentsAvailable))
      .catch(() => setPaymentsAvailable(false));
  }, []);

  // ₹2.50/credit (250 paise) — matches app/api/billing/create-order/route.ts
  // `qty * 250`. This modal previously showed USD ($0.03/credit) while the
  // actual Razorpay charge was always INR — currency AND amount shown to
  // the user were both wrong versus what got charged.
  const pricePerCredit = 2.5;
  const GST_RATE = 0.18;
  const subtotal = Math.round(quantity * pricePerCredit);
  const tax = Math.round(subtotal * GST_RATE);
  const total = subtotal + tax;

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const handlePay = async () => {
    if (paymentsAvailable === false) {
      toast.error("Payments aren't set up on this account yet. Please contact support.");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credits", quantity }),
      });
      if (!res.ok) {
        toast.error("Could not start payment. Please try again.");
        return;
      }
      const { orderId, amount, currency, keyId } = await res.json();
      const result = await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        name: "AryaSDR",
        description: `${quantity.toLocaleString("en-US")} credits`,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName ?? undefined,
        },
        verifyBody: { type: "credits", quantity },
        preferredMethod: tab,
        onVerified: () => {
          toast.success(`Purchased ${quantity.toLocaleString("en-US")} credits`);
          onClose();
          router.refresh();
        },
      });
      if (result.success === false && result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl mx-4 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#111827]">Buy extra credits</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quantity selector */}
        <div className="px-6 py-5 border-b border-[#E5E7EB]">
          <label className="block text-sm font-medium text-[#111827] mb-2">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1000, q - 1000))}
              className="h-9 w-9 flex items-center justify-center border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-gray-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-semibold text-[#111827] w-20 text-center">
              {quantity.toLocaleString("en-US")}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1000)}
              className="h-9 w-9 flex items-center justify-center border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-xs text-[#6B7280] ml-2">
              ₹{pricePerCredit.toFixed(2)} / credit
            </span>
          </div>
        </div>

        {/* Two-column payment layout */}
        <div className="grid grid-cols-1 md:grid-cols-[40%_60%]">
          {/* LEFT: Order summary */}
          <div className="bg-[#F9FAFB] p-6 border-r border-[#E5E7EB]">
            <h3 className="text-sm font-semibold text-[#111827] mb-4">
              Order summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">
                  Credits ({quantity.toLocaleString("en-US")})
                </span>
                <span className="text-[#111827]">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6B7280]">
                  ₹{pricePerCredit.toFixed(2)} × {quantity.toLocaleString("en-US")}
                </span>
                <span className="text-[#6B7280]"></span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Subtotal</span>
                <span className="text-[#111827]">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Tax (18% GST)</span>
                <span className="text-[#111827]">{formatMoney(tax)}</span>
              </div>
              <hr className="border-[#E5E7EB]" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-[#111827]">Total</span>
                <span className="text-[#111827]">{formatMoney(total)}</span>
              </div>
              <p className="text-xs text-[#6B7280] pt-1">One-time charge</p>
            </div>
          </div>

          {/* RIGHT: Payment method */}
          <div className="p-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[#E5E7EB] mb-5">
              <button
                onClick={() => setTab("card")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                  tab === "card"
                    ? "text-[#6C47FF] border-b-2 border-[#6C47FF] -mb-px"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                <CreditCard className="h-4 w-4" /> Card
              </button>
              <button
                onClick={() => setTab("upi")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                  tab === "upi"
                    ? "text-[#6C47FF] border-b-2 border-[#6C47FF] -mb-px"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                <Smartphone className="h-4 w-4" /> UPI
              </button>
            </div>

            {/* Tab content */}
            {tab === "card" && (
              <div className="space-y-3">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  {(["VISA", "MC", "AMEX", "DISCOVER", "RUPAY"] as CardBrand[]).map(
                    (key) => (
                      <CardBrandLogo key={key} brand={key} className="h-6 w-10" />
                    )
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-[#111827]">
                    Cardholder name
                  </label>
                  <input
                    placeholder="Name on card"
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#111827]">
                    Card number
                  </label>
                  <div className="relative">
                    <input
                      placeholder="1234 1234 1234 1234"
                      className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 pr-10 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#111827]">
                      Expiration
                    </label>
                    <input
                      placeholder="MM / YY"
                      className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#111827]">
                      CVC
                    </label>
                    <input
                      placeholder="CVC"
                      className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#111827]">
                    Billing country
                  </label>
                  <select
                    defaultValue="India"
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none bg-white"
                  >
                    <option>India</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Singapore</option>
                    <option>United Arab Emirates</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#111827] pt-1">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-[#E5E7EB] text-[#6C47FF] focus:ring-[#6C47FF]"
                  />
                  Save card for future payments
                </label>
              </div>
            )}


            {tab === "upi" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white border border-[#E5E7EB] p-2 shrink-0">
                      <Smartphone className="h-5 w-5 text-[#6C47FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">Pay by UPI</p>
                      <p className="text-xs text-[#6B7280] mt-1">
                        Enter your UPI ID, scan a QR code, or approve the request
                        directly in your UPI app. Razorpay handles the whole flow
                        securely.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-[#111827] mb-2">
                    Works with every major UPI app
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded px-2 py-1 text-[11px] font-semibold bg-white border border-[#E5E7EB]">
                      GPay
                    </span>
                    <span className="rounded px-2 py-1 text-[11px] font-semibold bg-[#5F259F] text-white">
                      PhonePe
                    </span>
                    <span className="rounded px-2 py-1 text-[11px] font-semibold bg-[#00BAF2] text-white">
                      Paytm
                    </span>
                    <span className="rounded px-2 py-1 text-[11px] font-semibold bg-[#00A651] text-white">
                      BHIM
                    </span>
                    <span className="rounded px-2 py-1 text-[11px] font-semibold bg-[#232F3E] text-white">
                      Amazon Pay
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#6B7280] flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> UPI PIN is entered on your bank&apos;s
                  secure screen, never on ours.
                </p>
              </div>
            )}

            {/* Trust signals */}
            <div className="mt-5 pt-4 border-t border-[#E5E7EB] space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <Lock className="h-3 w-3" />
                Secured by 256-bit SSL encryption
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                Powered by{" "}
                <span className="font-bold text-[#0E2A8C]">Razorpay</span>
              </div>
            </div>

            {/* Payments-not-configured banner */}
            {paymentsAvailable === false && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold">Payments aren&apos;t set up yet</p>
                  <p className="mt-0.5">
                    Contact your account admin to enable Razorpay before purchasing.
                  </p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handlePay}
              disabled={processing || paymentsAvailable === false}
              className="mt-4 w-full h-12 bg-[#6C47FF] text-white text-sm font-semibold rounded-full hover:bg-[#5835E8] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : paymentsAvailable === false ? (
                <>Payments unavailable</>
              ) : (
                <>Pay {formatMoney(total)}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Billing Page                                                       */
/* ------------------------------------------------------------------ */
type Transaction = {
  id: string;
  amount: number;
  currency: string | null;
  status: string;
  description: string | null;
  providerPaymentId: string | null;
  createdAt: string;
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Free trial",
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { openCheckout } = useRazorpay();
  const { data: subscription, refresh: refreshSubscription } = useSubscription();
  const reducedMotion = useReducedMotion();

  // Feedback for PayPal redirect flow (?paypal=success|cancelled|error&code=…).
  // paypal-return sets these when the browser lands back on /settings/billing
  // after PayPal approves, the user cancels, or the capture fails. We toast
  // once, refresh the subscription so the plan card flips to "Current Plan",
  // then strip the query string so a refresh doesn't re-fire.
  useEffect(() => {
    const paypal = searchParams.get("paypal");
    if (!paypal) return;
    if (paypal === "success") {
      toast.success("Your subscription is active. Welcome aboard!", {
        duration: 6000,
      });
      // Nudge the subscription hook so the "Current Plan" chip flips
      // without waiting for the next focus refetch.
      refreshSubscription();
      router.refresh();
    } else if (paypal === "cancelled") {
      toast("Checkout cancelled, no charge was made.", { duration: 5000 });
    } else if (paypal === "error") {
      const code = searchParams.get("code");
      toast.error(
        code
          ? `PayPal couldn't complete the payment (${code}). Please try again or email sales@aryasdr.in.`
          : "PayPal couldn't complete the payment. Please try again or email sales@aryasdr.in.",
        { duration: 8000 }
      );
    }
    // Clean the URL so a refresh doesn't re-trigger the toast. We use
    // history.replaceState instead of router.replace so this stays a
    // client-side no-op and doesn't kick off a re-render.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("paypal");
      url.searchParams.delete("code");
      window.history.replaceState(null, "", url.toString());
    }
    // Intentionally run once on mount — searchParams is stable per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([
    { label: "Mailbox slots", quantity: 0, unitPrice: 599, unitLabel: "/mo", type: "mailbox" },
    { label: "Human dialer seats", quantity: 0, unitPrice: 6299, unitLabel: "/mo", type: "dialer" },
    { label: "Phone number slots", quantity: 0, unitPrice: 499, unitLabel: "/mo", type: "phone" },
  ]);
  const [purchasingIdx, setPurchasingIdx] = useState<number | null>(null);

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Edit billing details
  const [editingDetails, setEditingDetails] = useState(false);
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    async function loadBillingInfo() {
      // Fire both requests in parallel — they're independent, and running
      // them serially doubled the billing page's shell-to-hydrated latency.
      const [profileRes, billingRes] = await Promise.all([
        fetch("/api/user/profile").catch(() => null),
        fetch("/api/user/billing-details").catch(() => null),
      ]);
      if (profileRes?.ok) {
        try {
          const data = await profileRes.json();
          const name = data.companyName || "My organization";
          setBillingName(name);
          setNameDraft(name);
        } catch {}
      }
      if (billingRes?.ok) {
        try {
          const data = await billingRes.json();
          if (data.billingEmail) {
            setBillingEmail(data.billingEmail);
            setEmailDraft(data.billingEmail);
          }
          if (data.billingName) {
            setBillingName(data.billingName);
            setNameDraft(data.billingName);
          }
        } catch {}
      }
    }
    loadBillingInfo();
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Currency preference — used for the dual-currency price display and the
  // payment-method disclosure. Priority: +91 phone in Clerk profile → INR
  // (locked) > localStorage (set by /pricing or ChangePlanModal) > browser
  // locale > INR fallback.
  const [currencyPref, setCurrencyPref] = useState<PrefCurrency>("INR");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const phones: string[] = [];
      if (user?.primaryPhoneNumber?.phoneNumber) {
        phones.push(user.primaryPhoneNumber.phoneNumber);
      }
      if (Array.isArray(user?.phoneNumbers)) {
        for (const p of user.phoneNumbers) {
          if (p?.phoneNumber && p.phoneNumber !== user?.primaryPhoneNumber?.phoneNumber) {
            phones.push(p.phoneNumber);
          }
        }
      }
      // Server geo (Vercel edge) locks currency by country: IN → INR, else USD.
      const isIndia = await fetchGeoIsIndia();
      if (cancelled) return;
      const { currency } = resolveCurrency({ phones, isIndia });
      setCurrencyPref(currency);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setBillingEmail(user.primaryEmailAddress.emailAddress);
      setEmailDraft(user.primaryEmailAddress.emailAddress);
    }
  }, [user?.primaryEmailAddress?.emailAddress]);

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const res = await fetch("/api/billing/transactions", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setTransactions(Array.isArray(json.transactions) ? json.transactions : []);
      }
    } catch {
      // leave transactions empty — table falls back to "No transactions yet"
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const updateQuantity = (index: number, delta: number) => {
    setOtherCosts((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
      )
    );
  };

  const otherCostsTotal = otherCosts.reduce(
    (sum, c) => sum + c.quantity * c.unitPrice,
    0
  );

  const formatINR = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "-";

  const handleBuyOtherCost = async (idx: number) => {
    const cost = otherCosts[idx];
    if (!cost || cost.quantity <= 0) {
      toast.error("Set a quantity greater than 0 first");
      return;
    }
    setPurchasingIdx(idx);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: cost.type, quantity: cost.quantity }),
      });
      if (!res.ok) {
        toast.error("Could not start payment. Please try again.");
        return;
      }
      const { orderId, amount, currency, keyId } = await res.json();
      const result = await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        name: "AryaSDR",
        description: `${cost.quantity} × ${cost.label}`,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName ?? undefined,
        },
        verifyBody: { type: cost.type, quantity: cost.quantity },
        onVerified: () => {
          toast.success(`Purchased ${cost.quantity} × ${cost.label}`);
          loadTransactions();
          router.refresh();
        },
      });
      if (result.success === false && result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setPurchasingIdx(null);
    }
  };

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      toast.error("No transactions to export yet");
      return;
    }
    const header = ["Invoice", "Status", "Amount", "Created"];
    const rows = transactions.map((t) => [
      t.providerPaymentId ?? t.id,
      t.status,
      ((t.amount ?? 0) / 100).toFixed(2),
      new Date(t.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aryasdr-transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded transactions.csv");
  };

  const creditsRemaining = subscription
    ? Math.max(0, subscription.credits - subscription.creditsUsed)
    : 0;
  const creditsRemainingPct = subscription && subscription.credits > 0
    ? Math.round((creditsRemaining / subscription.credits) * 100)
    : 100;
  const creditsBarColor =
    creditsRemainingPct > 50 ? "#10B981" : creditsRemainingPct > 20 ? "#F59E0B" : "#EF4444";
  const planLabel = subscription ? PLAN_LABELS[subscription.tier] ?? subscription.tier : "-";
  const renewalDate = subscription
    ? formatDate(subscription.isTrialing ? subscription.trialEndsAt : subscription.currentPeriodEnd)
    : "-";

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your team, their accounts and mailboxes.
        </p>
      </div>

      {/* Low-credit warning — fires at 80% usage (20% remaining or less) */}
      {subscription && creditsRemainingPct <= 20 && creditsRemainingPct > 0 && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
          creditsRemainingPct <= 5
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}>
          <div className="text-lg leading-none">{creditsRemainingPct <= 5 ? "🚨" : "⚠️"}</div>
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {creditsRemainingPct <= 5
                ? "You're almost out of credits."
                : "You're running low on credits."}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {creditsRemaining.toLocaleString("en-US")} of {subscription.credits.toLocaleString("en-US")} left.
              Upgrade or buy a top-up pack to avoid interrupted campaigns.
            </p>
          </div>
          <button
            onClick={() => setShowCreditsModal(true)}
            className="shrink-0 rounded-lg bg-white/70 hover:bg-white px-3 py-1.5 text-xs font-semibold border border-current/20 transition-colors"
          >
            Buy credits
          </button>
        </div>
      )}

      {/* Current plan — consolidated card (plan name + tier badge, next-charge date, credits meter) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[#111827]">{planLabel}</h2>
            {subscription && (
              <span className="inline-flex items-center rounded-full bg-[#EEF2FF] text-[#6C47FF] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider">
                {subscription.tier}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Next charge</p>
            <p className="mt-0.5 text-sm text-[#111827] tabular-nums">
              {subscription && (subscription.monthlyCostPaise ?? 0) > 0
                ? (() => {
                    const inrWhole = (subscription.monthlyCostPaise ?? 0) / 100;
                    const primary =
                      currencyPref === "USD"
                        ? formatCurrencyMoney(inrToUsdDisplay(inrWhole), "USD")
                        : formatINR(inrWhole);
                    return `${primary} on ${renewalDate}`;
                  })()
                : renewalDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setShowCreditsModal(true)}
            className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB] transition-colors"
          >
            Buy extra credits
          </button>
          <button
            onClick={() => setShowPlanModal(true)}
            className="rounded-full bg-[#6C47FF] text-white text-sm font-medium px-6 py-2.5 hover:bg-[#5835E8] transition-colors"
          >
            Upgrade plan
          </button>
        </div>

        <div>
          <div className="flex items-end justify-between mb-3">
            <span className="text-4xl font-semibold text-[#111827] tabular-nums">
              {creditsRemaining.toLocaleString("en-US")}
            </span>
            <span className="text-sm text-[#6B7280] tabular-nums">
              {subscription
                ? `${subscription.creditsUsed.toLocaleString("en-US")} / ${subscription.credits.toLocaleString("en-US")} credits used`
                : "Loading…"}
            </span>
          </div>
          <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
            {/* Animate width from 0 → actual on mount using Framer Motion */}
            <motion.div
              className="h-full rounded-full"
              initial={reducedMotion ? false : { width: 0 }}
              animate={{ width: `${creditsRemainingPct}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ backgroundColor: creditsBarColor }}
            />
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#111827]">Payment method</h2>
          <button
            onClick={() => setShowPlanModal(true)}
            className="rounded-full bg-[#6C47FF] text-white text-xs font-medium px-5 py-2 hover:bg-[#5835E8] transition-colors"
          >
            Update card
          </button>
        </div>
        {transactions && transactions.length > 0 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardBrandLogo brand="VISA" className="h-6 w-10" />
              <div>
                <p className="text-sm text-[#111827] font-mono tracking-widest">
                  •••• •••• •••• 4242
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">Expires 12/28</p>
              </div>
            </div>
            <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-medium text-[#6B7280]">
              Managed via Razorpay Checkout
            </span>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">
            No payment method on file. A card is captured the first time you upgrade a plan or buy credits.
          </p>
        )}
      </div>

      {/* Other costs */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Other costs</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Other costs
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Quantity
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Unit price
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Total
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2" />
            </tr>
          </thead>
          <tbody>
            {otherCosts.map((cost, idx) => (
              <tr
                key={cost.label}
                className={idx < otherCosts.length - 1 ? "border-b border-gray-100" : ""}
              >
                <td className="py-3 text-sm text-gray-700">{cost.label}</td>
                <td className="py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => updateQuantity(idx, -1)}
                      className="h-7 w-7 flex items-center justify-center border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm text-gray-700 w-6 text-center">
                      {cost.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(idx, 1)}
                      className="h-7 w-7 flex items-center justify-center border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="py-3 text-sm text-gray-700 text-right">
                  {formatINR(cost.unitPrice)}
                  {cost.unitLabel}
                </td>
                <td className="py-3 text-sm text-gray-700 text-right">
                  {formatINR(cost.quantity * cost.unitPrice)}
                  {cost.unitLabel}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleBuyOtherCost(idx)}
                    disabled={purchasingIdx === idx || cost.quantity <= 0}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#6C47FF] rounded-md hover:bg-[#5a3ad4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {purchasingIdx === idx ? "Processing…" : "Buy"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td colSpan={3} className="py-3 text-sm font-medium text-gray-700">
                Other costs total
              </td>
              <td className="py-3 text-sm font-medium text-gray-700 text-right" colSpan={2}>
                {formatINR(otherCostsTotal)}/mo
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="py-3 text-sm font-semibold text-gray-900">
                Total monthly cost
              </td>
              <td className="py-3 text-xs text-gray-500 text-right">
                Renews {renewalDate}
              </td>
              <td className="py-3 text-sm font-semibold text-gray-900 text-right" colSpan={2}>
                {formatINR(otherCostsTotal)}/mo
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment details */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Payment details</h2>
          <button
            onClick={() => {
              setNameDraft(billingName);
              setEmailDraft(billingEmail);
              setEditingDetails(true);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit details
          </button>
        </div>

        {editingDetails ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Billing email
                </label>
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={savingDetails}
                onClick={async () => {
                  const newName = nameDraft.trim() || billingName;
                  const newEmail = emailDraft.trim() || billingEmail;
                  setSavingDetails(true);
                  try {
                    const res = await fetch("/api/user/billing-details", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ billingName: newName, billingEmail: newEmail }),
                    });
                    if (!res.ok) throw new Error();
                    setBillingName(newName);
                    setBillingEmail(newEmail);
                    setEditingDetails(false);
                    toast.success("Billing details updated");
                  } catch {
                    toast.error("Failed to save billing details");
                  } finally {
                    setSavingDetails(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#6C47FF] rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
              >
                {savingDetails ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditingDetails(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Billing email
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Payment info
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 text-sm text-gray-700">{billingName}</td>
                <td className="py-3 text-sm text-gray-700">{billingEmail}</td>
                <td className="py-3 text-sm text-gray-400">-</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Transaction history</h2>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Invoice
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingTransactions ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                  No transactions yet
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 text-sm text-gray-700 font-mono text-xs">
                    {t.providerPaymentId ?? t.id.slice(0, 12)}
                  </td>
                  <td className="py-3 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === "succeeded"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-700">
                    {formatINR((t.amount ?? 0) / 100)}
                  </td>
                  <td className="py-3 text-sm text-gray-700">
                    {formatDate(t.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cancel subscription */}
      {subscription &&
        ["starter", "growth", "scale"].includes(subscription.tier) &&
        subscription.status === "active" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-red-800">
                  Cancel subscription
                </h2>
                <p className="text-xs text-red-700 mt-1">
                  You&apos;ll keep access to your plan until the end of the current billing period.
                </p>
              </div>
              <button
                onClick={() => setShowCancelModal(true)}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
              >
                Cancel subscription
              </button>
            </div>
          </div>
        )}

      {/* Modals */}
      {showCreditsModal && <BuyCreditsModal onClose={() => setShowCreditsModal(false)} />}
      {showPlanModal && <ChangePlanModal onClose={() => setShowPlanModal(false)} />}
      {showCancelModal && subscription && (
        <CancellationFlowModal
          planName={PLAN_LABELS[subscription.tier] ?? subscription.tier}
          onClose={() => setShowCancelModal(false)}
          onCancelConfirmed={async () => {
            const res = await fetch("/api/billing/cancel", { method: "POST" });
            if (!res.ok) throw new Error("Failed to cancel subscription");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
