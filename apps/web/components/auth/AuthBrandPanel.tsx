"use client";

import { AryaAvatar } from "@/components/arya/AryaAvatar";

const COMPANIES = ["Zepto", "CRED", "Groww", "PhonePe", "Razorpay", "Meesho"];

export function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex w-[44%] bg-[#6C47FF] flex-col justify-between p-10 text-white relative overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold leading-tight">
          Put outbound on
          <br />
          autopilot with
          <br />
          <span className="text-pink-300">Arya</span>
        </h2>
      </div>
      <div className="flex-1 flex items-center justify-center py-8">
        <AryaAvatar size="xl" variant="full" />
      </div>
      <div className="text-center space-y-4">
        <p className="text-sm text-white/70">
          Trusted by 500+ B2B founders across India
        </p>
        <div className="relative overflow-hidden h-6">
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {[...COMPANIES, ...COMPANIES].map((co, i) => (
              <span
                key={`${co}-${i}`}
                className="text-xs font-medium text-white/50"
              >
                {co}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
}
