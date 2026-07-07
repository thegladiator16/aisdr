"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Phone, X, Minus, Plus, CreditCard, Check, Loader2, Lock } from "lucide-react";
import { useRazorpay } from "@/hooks/useRazorpay";

const tabs = ["Ready to call", "Upcoming", "Call log"] as const;
type Tab = (typeof tabs)[number];

type PayTab = "Card" | "UPI" | "Net Banking";

export default function DialerPage() {
  const router = useRouter();
  const { user } = useUser();
  const { openCheckout } = useRazorpay();
  const [activeTab, setActiveTab] = useState<Tab>("Ready to call");
  const [dialerModalOpen, setDialerModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [payTab, setPayTab] = useState<PayTab>("Card");

  // Card fields
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [country, setCountry] = useState("US");
  const [saveCard, setSaveCard] = useState(false);

  // UPI
  const [upiId, setUpiId] = useState("");

  // Net banking
  const [bank, setBank] = useState("HDFC Bank");

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const unitPrice = 75;
  const GST_RATE = 0.18;
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const resetState = () => {
    setPurchasing(false);
    setPurchaseSuccess(false);
    setQuantity(1);
    setPayTab("Card");
    setCardholderName("");
    setCardNumber("");
    setExpiration("");
    setSecurityCode("");
    setCountry("US");
    setSaveCard(false);
    setUpiId("");
    setBank("HDFC Bank");
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dialer", quantity }),
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
        description: `${quantity} dialer seat${quantity > 1 ? "s" : ""}`,
        prefill: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName ?? undefined,
        },
        verifyBody: { type: "dialer", quantity },
        onVerified: () => {
          toast.success(
            `Purchased ${quantity} dialer seat${quantity > 1 ? "s" : ""}`,
          );
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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Dialer</h1>

      {/* Tabs */}
      <div className="flex gap-6 mt-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-[#6C47FF] text-[#6C47FF]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Ready to call" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Phone className="h-8 w-8 text-gray-300" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">
            Buy a dialer seat
          </h2>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Arya gives reps live talking points and summaries of past
            interactions.
          </p>
          <button
            onClick={() => setDialerModalOpen(true)}
            className="mt-6 rounded-lg bg-[#6C47FF] px-6 py-2.5 text-white hover:bg-[#5538DD] transition"
          >
            Buy dialer seats
          </button>
        </div>
      )}

      {activeTab === "Upcoming" && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-gray-500">No upcoming calls</p>
        </div>
      )}

      {activeTab === "Call log" && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-gray-500">No call history yet</p>
        </div>
      )}

      {/* Purchase Modal */}
      {dialerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-lg font-bold text-[#111827]">
                Purchase {quantity} dialer seat{quantity > 1 ? "s" : ""}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success State */}
            {purchaseSuccess ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#111827]">
                  Purchase successful!
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  {quantity} dialer seat{quantity > 1 ? "s" : ""} added to your account.
                </p>
              </div>
            ) : (
              <>
                {/* Modal Body: two-column flex (stacks on mobile) */}
                <div className="flex flex-col md:flex-row">
                  {/* LEFT: Order Summary (40% on desktop) */}
                  <div className="w-full md:w-2/5 bg-[#F9FAFB] p-6 border-b md:border-b-0 md:border-r border-[#E5E7EB]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#111827]">
                        Dialer Seats
                      </h3>
                      <span className="rounded-full bg-[#6C47FF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6C47FF]">
                        Add-on
                      </span>
                    </div>

                    {/* Quantity selector */}
                    <div className="mt-4">
                      <label className="text-xs text-[#6B7280]">
                        Dialer seats to add
                      </label>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() =>
                            setQuantity((q) => Math.max(1, q - 1))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-semibold text-[#111827]">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-gray-50 transition"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6B7280]">
                          Subtotal (${unitPrice} × {quantity})
                        </span>
                        <span className="text-[#111827]">{fmt(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6B7280]">Tax (18% GST)</span>
                        <span className="text-[#111827]">{fmt(tax)}</span>
                      </div>
                      <hr className="border-[#E5E7EB]" />
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-[#111827]">
                          Total
                        </span>
                        <span className="text-lg font-bold text-[#111827]">
                          {fmt(total)}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280]">Billed monthly</p>
                    </div>
                  </div>

                  {/* RIGHT: Payment Method (60%) */}
                  <div className="w-full md:w-3/5 p-6">
                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-[#E5E7EB]">
                      {(["Card", "UPI", "Net Banking"] as PayTab[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPayTab(t)}
                          className={`px-4 py-2 text-sm font-medium rounded-t-full transition ${
                            payTab === t
                              ? "text-[#6C47FF] border-b-2 border-[#6C47FF]"
                              : "text-[#6B7280] hover:text-[#111827]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* CARD TAB */}
                    {payTab === "Card" && (
                      <div className="mt-4 space-y-3">
                        {/* Brand badges */}
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#1A1F71]">
                            VISA
                          </span>
                          <span className="rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#EB001B]">
                            MC
                          </span>
                          <span className="rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#2E77BB]">
                            AMEX
                          </span>
                          <span className="rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#FF6000]">
                            DISC
                          </span>
                          <span className="rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#097E3B]">
                            RuPay
                          </span>
                        </div>

                        <div>
                          <label className="text-xs text-[#6B7280]">
                            Cardholder name
                          </label>
                          <input
                            type="text"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="Name on card"
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] transition"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-[#6B7280]">
                            Card number
                          </label>
                          <div className="relative mt-1">
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              placeholder="1234 1234 1234 1234"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-[#111827] outline-none focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] transition"
                            />
                            <CreditCard className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-[#6B7280]">
                              Expiration
                            </label>
                            <input
                              type="text"
                              value={expiration}
                              onChange={(e) => setExpiration(e.target.value)}
                              placeholder="MM / YY"
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] transition"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#6B7280]">CVC</label>
                            <input
                              type="text"
                              value={securityCode}
                              onChange={(e) => setSecurityCode(e.target.value)}
                              placeholder="CVC"
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] transition"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-[#6B7280]">
                            Billing country
                          </label>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] transition"
                          >
                            <option value="US">United States</option>
                            <option value="IN">India</option>
                            <option value="UK">United Kingdom</option>
                            <option value="CA">Canada</option>
                            <option value="AU">Australia</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-[#6B7280] pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveCard}
                            onChange={(e) => setSaveCard(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
                          />
                          Save card for future payments
                        </label>
                      </div>
                    )}

                    {/* UPI TAB */}
                    {payTab === "UPI" && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-xs text-[#6B7280]">
                            UPI ID
                          </label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="name@bank"
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] transition"
                          />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-semibold text-[#4285F4]">
                            GPay
                          </span>
                          <span className="rounded border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-semibold text-[#5F259F]">
                            PhonePe
                          </span>
                          <span className="rounded border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-semibold text-[#00BAF2]">
                            Paytm
                          </span>
                          <span className="rounded border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-semibold text-[#EF7B22]">
                            BHIM
                          </span>
                        </div>

                        <p className="text-xs text-[#6B7280]">
                          You'll get a payment request on your UPI app
                        </p>
                      </div>
                    )}

                    {/* NET BANKING TAB */}
                    {payTab === "Net Banking" && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-xs text-[#6B7280]">
                            Select bank
                          </label>
                          <select
                            value={bank}
                            onChange={(e) => setBank(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] transition"
                          >
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
                          You'll be redirected to your bank's secure portal.
                        </p>
                      </div>
                    )}

                    {/* Trust signals */}
                    <div className="mt-5 space-y-2 border-t border-[#E5E7EB] pt-4">
                      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Secured by 256-bit SSL encryption</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                        <span>Powered by</span>
                        <span className="font-bold text-[#0E2A8C]">
                          Razorpay
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="border-t border-[#E5E7EB] px-6 py-4">
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-5 text-sm font-semibold text-white hover:bg-[#5538DD] transition disabled:opacity-70"
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Pay {fmt(total)}</>
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
