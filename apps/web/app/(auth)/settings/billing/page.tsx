"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Minus,
  Plus,
  ChevronDown,
  X,
} from "lucide-react";
import { ChangePlanModal } from "@/components/billing/ChangePlanModal";

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
  const [quantity, setQuantity] = useState(1000);
  const pricePerBundle = 0.03;
  const total = quantity * pricePerBundle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Buy extra credits</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1000, q - 1000))}
                className="h-9 w-9 flex items-center justify-center border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-semibold text-gray-900 w-20 text-center">
                {quantity.toLocaleString("en-US")}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1000)}
                className="h-9 w-9 flex items-center justify-center border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Price</span>
              <span className="text-gray-700">{`$${pricePerBundle.toFixed(2)} / credit`}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{`$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success(`Purchased ${quantity.toLocaleString("en-US")} credits`);
                onClose();
              }}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
            >
              Purchase credits
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
