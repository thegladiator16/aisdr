"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CreditEstimator() {
  const [leads, setLeads] = useState(500);
  const [steps, setSteps] = useState(3);
  const credits = leads * steps;

  const plan =
    credits <= 500
      ? { name: "Free", href: "/sign-up" }
      : credits <= 5000
      ? { name: "Starter", href: "/sign-up?plan=starter" }
      : credits <= 20000
      ? { name: "Growth", href: "/sign-up?plan=growth" }
      : { name: "Enterprise", href: "/contact" };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-8 max-w-xl mx-auto shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Estimate your credits</h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Leads per month</span>
            <span className="font-semibold text-gray-900">{leads.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={leads}
            onChange={(e) => setLeads(Number(e.target.value))}
            className="w-full accent-[#6C47FF]"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Steps per sequence</span>
            <span className="font-semibold text-gray-900">{steps}</span>
          </div>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            className="w-full accent-[#6C47FF]"
          />
        </div>

        <div className="rounded-xl bg-[#F0EEFF] p-4 text-center">
          <p className="text-sm text-gray-600">Estimated credits needed</p>
          <p className="text-3xl font-bold text-[#6C47FF] mt-1">
            {credits.toLocaleString()}/month
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Best plan for you: <span className="font-semibold text-gray-900">{plan.name}</span>
          </p>
        </div>

        <Link
          href={plan.href}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-6 py-3 text-sm font-semibold text-white hover:bg-[#5A38E0] transition-colors w-full"
        >
          Get started with {plan.name} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
