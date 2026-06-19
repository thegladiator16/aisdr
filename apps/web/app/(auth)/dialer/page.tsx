"use client";

import { useState } from "react";
import { Phone, X, Minus, Plus, CreditCard, Check, Loader2 } from "lucide-react";

const tabs = ["Ready to call", "Upcoming", "Call log"] as const;
type Tab = (typeof tabs)[number];

export default function DialerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Ready to call");
  const [dialerModalOpen, setDialerModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [country, setCountry] = useState("US");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const unitPrice = 75;
  const monthlyFee = unitPrice * quantity;
  const dueToday = Math.round(unitPrice * quantity * 0.85);

  const handlePurchase = () => {
    setPurchasing(true);
    setTimeout(() => {
      setPurchasing(false);
      setPurchaseSuccess(true);
      setTimeout(() => {
        setDialerModalOpen(false);
        setPurchaseSuccess(false);
        setQuantity(1);
        setCardNumber("");
        setExpiration("");
        setSecurityCode("");
        setCountry("US");
      }, 1500);
    }, 1500);
  };

  const closeModal = () => {
    setDialerModalOpen(false);
    setPurchasing(false);
    setPurchaseSuccess(false);
    setQuantity(1);
    setCardNumber("");
    setExpiration("");
    setSecurityCode("");
    setCountry("US");
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
            className="mt-6 rounded-lg bg-[#6C47FF] px-6 py-2.5 text-white hover:bg-[#5a38e0] transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Add dialer seats</h2>
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
                <h3 className="mt-4 text-lg font-bold text-gray-900">Purchase successful!</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {quantity} dialer seat{quantity > 1 ? "s" : ""} added to your account.
                </p>
              </div>
            ) : (
              <>
                {/* Modal Body */}
                <div className="grid grid-cols-2 gap-6 px-6 py-6">
                  {/* LEFT: Order Summary */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Order summary
                    </h3>

                    <div className="mt-4">
                      <label className="text-sm text-gray-600">Dialer seats to add</label>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-semibold text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Unit price</span>
                        <span className="text-gray-900">$75/mo</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Monthly fee</span>
                        <span className="text-gray-900">
                          ${monthlyFee.toLocaleString("en-US")}/mo
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold border-t border-gray-100 pt-3">
                        <span className="text-gray-700">Due today (prorated)</span>
                        <span className="text-gray-900">
                          ${dueToday.toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Payment Method */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Payment method
                    </h3>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500">Card number</label>
                        <div className="relative mt-1">
                          <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="1234 1234 1234 1234"
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-[#6C47FF] transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Expiration date</label>
                          <input
                            type="text"
                            value={expiration}
                            onChange={(e) => setExpiration(e.target.value)}
                            placeholder="MM / YY"
                            className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Security code</label>
                          <input
                            type="text"
                            value={securityCode}
                            onChange={(e) => setSecurityCode(e.target.value)}
                            placeholder="CVC"
                            className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">Country</label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition bg-white"
                        >
                          <option value="US">United States</option>
                          <option value="IN">India</option>
                          <option value="US">United States</option>
                          <option value="UK">United Kingdom</option>
                        </select>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed">
                        By providing your card information, you allow AryaSDR to charge your card for
                        future payments in accordance with their terms.
                      </p>

                      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                        <p className="text-xs text-blue-700">
                          This will update your default payment method for all future invoices.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                  <button
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="flex items-center gap-2 rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition disabled:opacity-70"
                  >
                    {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {purchasing
                      ? "Processing..."
                      : `Purchase ${quantity} dialer seat${quantity > 1 ? "s" : ""} — $${dueToday.toLocaleString("en-US")}`}
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
