"use client";

import { useState } from "react";
import {
  Download,
  Minus,
  Plus,
  ChevronDown,
} from "lucide-react";

type OtherCost = {
  label: string;
  quantity: number;
  unitPrice: number;
  unitLabel: string;
};

export default function BillingPage() {
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([
    { label: "Mailbox slots", quantity: 0, unitPrice: 580, unitLabel: "/mo" },
    {
      label: "Human dialer seats",
      quantity: 0,
      unitPrice: 6200,
      unitLabel: "/mo",
    },
    {
      label: "Phone number slots",
      quantity: 0,
      unitPrice: 500,
      unitLabel: "/mo",
    },
  ]);

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
    `₹${amount.toLocaleString("en-IN")}`;

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
          <h2 className="text-sm font-semibold text-gray-900">
            Current credit balance
          </h2>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Buy extra credits
            </button>
            <button className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors">
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
            <button className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors">
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
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Other costs
        </h2>
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
                className={
                  idx < otherCosts.length - 1 ? "border-b border-gray-100" : ""
                }
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
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td
                colSpan={3}
                className="py-3 text-sm font-medium text-gray-700"
              >
                Other costs total
              </td>
              <td className="py-3 text-sm font-medium text-gray-700 text-right">
                {formatINR(otherCostsTotal)}/mo
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
                {formatINR(otherCostsTotal)}/mo
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Payment details
          </h2>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Add payment method
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Edit details
            </button>
          </div>
        </div>
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
              <td className="py-3 text-sm text-gray-700">
                AryaSDR&apos;s organization
              </td>
              <td className="py-3 text-sm text-gray-700">
                ironman150899@gmail.com
              </td>
              <td className="py-3 text-sm text-gray-400">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Transaction history
          </h2>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
    </div>
  );
}
