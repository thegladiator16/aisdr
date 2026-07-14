"use client";

import { useState } from "react";
import { Calculator, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ROICalculator() {
  const [sdrSalary, setSdrSalary] = useState(50000);
  const [sdrCount, setSdrCount] = useState(2);
  const [meetingsPerMonth, setMeetingsPerMonth] = useState(20);
  const [closeRate, setCloseRate] = useState(15);
  const [dealValue, setDealValue] = useState(100000);

  const currentMonthlyCost = sdrSalary * sdrCount;
  const costPerMeeting = meetingsPerMonth > 0 ? currentMonthlyCost / meetingsPerMonth : 0;

  const aryaMonthlyCost = 12999;
  const aryaMeetings = Math.round(meetingsPerMonth * 2.5);
  const aryaCostPerMeeting = aryaMeetings > 0 ? aryaMonthlyCost / aryaMeetings : 0;

  const monthlySavings = currentMonthlyCost - aryaMonthlyCost;
  const annualSavings = monthlySavings * 12;
  const roi = aryaMonthlyCost > 0 ? Math.round((monthlySavings / aryaMonthlyCost) * 100) : 0;
  const paybackDays = monthlySavings > 0 ? Math.max(1, Math.round((aryaMonthlyCost / monthlySavings) * 30)) : 0;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
          <Calculator className="h-4 w-4 text-[#6C47FF]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">ROI Calculator</h3>
          <p className="text-xs text-gray-500">See how much you save with AryaSDR</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">SDR salary/month</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={20000}
                max={150000}
                step={5000}
                value={sdrSalary}
                onChange={(e) => setSdrSalary(Number(e.target.value))}
                className="flex-1 accent-[#6C47FF]"
              />
              <span className="text-sm font-semibold text-gray-900 w-24 text-right">{formatINR(sdrSalary)}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Number of SDRs</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={sdrCount}
                onChange={(e) => setSdrCount(Number(e.target.value))}
                className="flex-1 accent-[#6C47FF]"
              />
              <span className="text-sm font-semibold text-gray-900 w-24 text-right">{sdrCount}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Meetings booked/month</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={meetingsPerMonth}
                onChange={(e) => setMeetingsPerMonth(Number(e.target.value))}
                className="flex-1 accent-[#6C47FF]"
              />
              <span className="text-sm font-semibold text-gray-900 w-24 text-right">{meetingsPerMonth}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Average deal value</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10000}
                max={1000000}
                step={10000}
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                className="flex-1 accent-[#6C47FF]"
              />
              <span className="text-sm font-semibold text-gray-900 w-24 text-right">{formatINR(dealValue)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-red-50 border border-red-100 p-4">
            <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">Current cost</p>
            <p className="text-xl font-bold text-red-600">{formatINR(currentMonthlyCost)}</p>
            <p className="text-xs text-gray-500 mt-0.5">/month ({sdrCount} SDRs)</p>
            <p className="text-xs text-gray-400 mt-1">{formatINR(Math.round(costPerMeeting))}/meeting</p>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
            <p className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold mb-1">With AryaSDR</p>
            <p className="text-xl font-bold text-[#6C47FF]">{formatINR(aryaMonthlyCost)}</p>
            <p className="text-xs text-gray-500 mt-0.5">/month (Growth plan)</p>
            <p className="text-xs text-gray-400 mt-1">{formatINR(Math.round(aryaCostPerMeeting))}/meeting</p>
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-700">Your savings</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-bold text-emerald-700">{formatINR(monthlySavings)}</p>
              <p className="text-[10px] text-gray-500">per month</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700">{formatINR(annualSavings)}</p>
              <p className="text-[10px] text-gray-500">per year</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700">{roi}%</p>
              <p className="text-[10px] text-gray-500">ROI</p>
            </div>
          </div>
          {paybackDays > 0 && (
            <p className="text-xs text-emerald-600 mt-2">
              Payback period: {paybackDays} days
            </p>
          )}
        </div>

        <Link
          href="/sign-up"
          className="flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-6 py-3 text-sm font-semibold text-white hover:bg-[#5A38E0] transition-colors w-full"
        >
          Start saving now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
