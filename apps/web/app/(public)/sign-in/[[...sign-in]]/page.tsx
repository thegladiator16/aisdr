import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your AryaSDR account.",
};

const COMPANIES = ["Zepto", "CRED", "Groww", "PhonePe", "Razorpay", "Meesho"];

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[44%] bg-[#6C47FF] flex-col justify-between p-10 text-white relative overflow-hidden">
        {/* Top: Headline */}
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Put outbound on
            <br />
            autopilot with
            <br />
            <span className="text-pink-300">Arya</span>
          </h2>
        </div>

        {/* Center: Avatar */}
        <div className="flex-1 flex items-center justify-center py-8">
          <AryaAvatar size="xl" className="scale-[1.8]" />
        </div>

        {/* Bottom: Trust bar */}
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
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-full bg-[#6C47FF] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">A</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-bold text-gray-900 text-center mb-1">
            Welcome to AryaSDR
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            Enter your email to get started
          </p>

          {/* Clerk form */}
          <SignIn
            afterSignInUrl="/dashboard"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0 w-full bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "bg-white border border-gray-200 rounded-lg h-11 hover:bg-gray-50 transition-colors",
                socialButtonsBlockButtonText:
                  "text-sm font-medium text-gray-700",
                socialButtonsBlockButtonArrow: "hidden",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-400 text-xs uppercase",
                formFieldRow: "mb-4",
                formFieldLabel: "text-sm font-medium text-gray-700 mb-1.5",
                formFieldInput:
                  "rounded-lg border border-gray-200 h-11 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none transition-colors w-full",
                formButtonPrimary:
                  "bg-[#6C47FF] hover:bg-[#5A38E0] rounded-lg h-11 text-sm font-medium transition-colors shadow-none w-full",
                formFieldAction:
                  "text-[#6C47FF] text-sm font-medium hover:text-[#5A38E0]",
                footerAction: "mt-6 justify-center",
                footerActionText: "text-sm text-gray-500",
                footerActionLink:
                  "text-[#6C47FF] font-medium hover:text-[#5A38E0] text-sm",
                footer: "hidden",
                badge: "hidden",
                identityPreview:
                  "rounded-lg border border-gray-200 bg-gray-50 px-4 py-3",
                identityPreviewText: "text-sm text-gray-700",
                identityPreviewEditButton:
                  "text-[#6C47FF] hover:text-[#5A38E0]",
                alert:
                  "rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm",
                otpCodeFieldInput:
                  "rounded-lg border border-gray-200 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF]",
              },
              layout: {
                socialButtonsPlacement: "top",
                showOptionalFields: false,
              },
            }}
          />

          {/* Legal text */}
          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-gray-600">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* Marquee animation */}
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
