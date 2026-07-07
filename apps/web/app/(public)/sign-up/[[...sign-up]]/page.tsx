"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useParams } from "next/navigation";

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

  return <AuthCard mode="sign-up" />;
}
