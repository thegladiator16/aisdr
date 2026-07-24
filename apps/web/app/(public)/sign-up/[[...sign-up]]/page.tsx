"use client";

import { SignUp, AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";

export default function SignUpPage() {
  const params = useParams();
  const rest = (params?.["sign-up"] as string[] | undefined) ?? [];
  const isCallback = rest.includes("sso-callback");

  if (isCallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#6C47FF] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Creating your account…</p>
        </div>
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/onboarding"
          appearance={{
            variables: {
              colorPrimary: "#6C47FF",
              colorText: "#111827",
              colorTextSecondary: "#6B7280",
              borderRadius: "0.75rem",
              fontFamily: "inherit",
            },
            elements: {
              rootBox: "w-full max-w-[400px]",
              card: "shadow-none border-none bg-transparent p-0",
              headerTitle: "text-[28px] font-bold text-gray-900",
              headerSubtitle: "text-sm text-gray-500",
              socialButtonsBlockButton:
                "border border-transparent bg-[#6C47FF] hover:bg-[#5835E8] text-white h-12 rounded-full text-sm font-semibold",
              socialButtonsBlockButtonText: "text-white",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-400 text-xs",
              formFieldLabel: "text-sm font-medium text-gray-700",
              formFieldInput:
                "rounded-xl border border-gray-200 h-12 px-4 text-sm focus:border-[#6C47FF] focus:ring-2 focus:ring-[#6C47FF]/20",
              formButtonPrimary:
                "bg-[#6C47FF] hover:bg-[#5A38E0] text-white h-12 rounded-full text-sm font-semibold normal-case",
              footerActionText: "text-sm text-gray-500",
              footerActionLink:
                "text-[#6C47FF] font-semibold hover:underline text-sm",
              identityPreview:
                "rounded-xl border border-gray-200 bg-gray-50 px-3",
              formResendCodeLink: "text-[#6C47FF] text-sm font-medium",
              otpCodeFieldInput:
                "rounded-xl border border-gray-200 focus:border-[#6C47FF]",
            },
          }}
        />
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Lock className="h-3 w-3" /> Secured by Clerk
        </div>
      </div>
      <AuthBrandPanel />
    </div>
  );
}
