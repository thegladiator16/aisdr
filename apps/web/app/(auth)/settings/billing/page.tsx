"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Download,
  Minus,
  Plus,
  ChevronDown,
  X,
  Lock,
  CreditCard,
  Smartphone,
  Landmark,
  Loader2,
} from "lucide-react";
import { ChangePlanModal } from "@/components/billing/ChangePlanModal";
import { useRazorpay } from "@/hooks/useRazorpay";

type OtherCost = {
  label: string;
  quantity: number;
  unitPrice: number;
  unitLabel: string;
};

/* ------------------------------------------------------------------ */
/*  Buy Credits Modal                                                  */
/* ------------------------------------------------------------------ */
function BuyCreditsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useUser();
  const { openCheckout } = useRazorpay();
  const [quantity, setQuantity] = useState(1000);
  const [tab, setTab] = useState<"card" | "upi" | "netbanking">("card");
  const [processing, setProcessing] = useState(false);

  const pricePerCredit = 0.03;
  const subtotal = Math.round(quantity * pricePerCredit * 100) / 100;
  const GST_RATE = 0.18;
  const tax = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePay = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
              ${pricePerCredit.toFixed(2)} / credit
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
                  ${pricePerCredit.toFixed(2)} × {quantity.toLocaleString("en-US")}
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
              <button
                onClick={() => setTab("netbanking")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                  tab === "netbanking"
                    ? "text-[#6C47FF] border-b-2 border-[#6C47FF] -mb-px"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                <Landmark className="h-4 w-4" /> Net Banking
              </button>
            </div>

            {/* Tab content */}
            {tab === "card" && (
              <div className="space-y-3">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <span className="text-[10px] font-bold text-white bg-[#1A1F71] px-1.5 py-0.5 rounded">
                    VISA
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#EB001B] px-1.5 py-0.5 rounded">
                    MC
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#006FCF] px-1.5 py-0.5 rounded">
                    AMEX
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#FF6000] px-1.5 py-0.5 rounded">
                    DISC
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#097DC6] px-1.5 py-0.5 rounded">
                    RuPay
                  </span>
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
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#111827]">
                    UPI ID
                  </label>
                  <input
                    placeholder="name@bank"
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-white bg-[#1A73E8] px-2 py-1 rounded">
                    GPay
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#5F259F] px-2 py-1 rounded">
                    PhonePe
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#00BAF2] px-2 py-1 rounded">
                    Paytm
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#EB6F2D] px-2 py-1 rounded">
                    BHIM
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  You&apos;ll get a payment request on your UPI app
                </p>
              </div>
            )}

            {tab === "netbanking" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#111827]">
                    Select your bank
                  </label>
                  <select className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none bg-white">
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>SBI</option>
                    <option>Axis Bank</option>
                    <option>Kotak</option>
                    <option>Yes Bank</option>
                    <option>Other</option>
                  </select>
                </div>
                <p className="text-xs text-[#6B7280]">
                  You&apos;ll be redirected to your bank&apos;s portal to complete payment
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

            {/* Submit button */}
            <button
              onClick={handlePay}
              disabled={processing}
              className="mt-4 w-full h-12 bg-[#6C47FF] text-white text-sm font-semibold rounded-lg hover:bg-[#5538DD] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
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
/*  Add Payment Method Modal                                           */
/* ------------------------------------------------------------------ */
function AddPaymentModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Add payment method</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Card number</label>
            <input
              placeholder="1234 1234 1234 1234"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Expiration date</label>
              <input
                placeholder="MM / YY"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Security code</label>
              <input
                placeholder="CVC"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Country</label>
            <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none">
              <option>India</option>
              <option>United States</option>
              <option>United Kingdom</option>
            </select>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            By providing your card information, you allow AryaSDR to charge your card for future
            payments in accordance with their terms.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success("Payment method added");
                onClose();
              }}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
            >
              Save card
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
export default function BillingPage() {
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([
    { label: "Mailbox slots", quantity: 0, unitPrice: 7, unitLabel: "/mo" },
    { label: "Human dialer seats", quantity: 0, unitPrice: 75, unitLabel: "/mo" },
    { label: "Phone number slots", quantity: 0, unitPrice: 6, unitLabel: "/mo" },
  ]);

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Edit billing details
  const [editingDetails, setEditingDetails] = useState(false);
  const [billingName, setBillingName] = useState("AryaSDR's organization");
  const [billingEmail, setBillingEmail] = useState("ironman150899@gmail.com");
  const [nameDraft, setNameDraft] = useState(billingName);
  const [emailDraft, setEmailDraft] = useState(billingEmail);

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

  const formatUSD = (amount: number) =>
    `$${amount.toLocaleString("en-US")}`;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your team, their accounts and mailboxes.
        </p>
      </div>

      {/* Current credit balance */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Current credit balance</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreditsModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Buy extra credits
            </button>
            <button
              onClick={() => setShowPlanModal(true)}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
            >
              Upgrade plan
            </button>
          </div>
        </div>
        <div className="flex items-end justify-between mb-3">
          <span className="text-4xl font-bold text-gray-900">10,000</span>
          <span className="text-sm text-gray-500">10K trial credits</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-full bg-[#6C47FF] rounded-full" />
        </div>
      </div>

      {/* Plan details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Plan details</h2>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Plan options
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowPlanModal(true)}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
            >
              Upgrade plan
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Current plan
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Renewal date
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Monthly credits
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Monthly credit cost
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 text-sm text-gray-700">Free</td>
              <td className="py-3 text-sm text-gray-700">Jul 13, 2026</td>
              <td className="py-3 text-sm text-gray-700">300 / mo</td>
              <td className="py-3 text-sm text-gray-700">$0 / mo</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Other costs */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
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
                  {formatUSD(cost.unitPrice)}
                  {cost.unitLabel}
                </td>
                <td className="py-3 text-sm text-gray-700 text-right">
                  {formatUSD(cost.quantity * cost.unitPrice)}
                  {cost.unitLabel}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td colSpan={3} className="py-3 text-sm font-medium text-gray-700">
                Other costs total
              </td>
              <td className="py-3 text-sm font-medium text-gray-700 text-right">
                {formatUSD(otherCostsTotal)}/mo
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="py-3 text-sm font-semibold text-gray-900">
                Total monthly cost
              </td>
              <td className="py-3 text-xs text-gray-500 text-right">
                Next billing Jul 13, 2026
              </td>
              <td className="py-3 text-sm font-semibold text-gray-900 text-right">
                {formatUSD(otherCostsTotal)}/mo
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Payment details</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Add payment method
            </button>
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
                onClick={() => {
                  setBillingName(nameDraft.trim() || billingName);
                  setBillingEmail(emailDraft.trim() || billingEmail);
                  setEditingDetails(false);
                  toast.success("Billing details updated");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#6C47FF] rounded-lg hover:bg-[#5a3ad4] transition-colors"
              >
                Save
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
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Transaction history</h2>
          <button
            onClick={() => toast.success("Downloading CSV...")}
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
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                No transactions yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreditsModal && <BuyCreditsModal onClose={() => setShowCreditsModal(false)} />}
      {showPlanModal && <ChangePlanModal onClose={() => setShowPlanModal(false)} />}
      {showPaymentModal && <AddPaymentModal onClose={() => setShowPaymentModal(false)} />}
    </div>
  );
}
