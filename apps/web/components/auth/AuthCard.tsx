"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { Mail, Key, Loader2, ArrowLeft } from "lucide-react";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

const COMPANIES = ["Zepto", "CRED", "Groww", "PhonePe", "Razorpay", "Meesho"];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AryaLogo() {
  return <AryaAvatar size="md" variant="head" />;
}

function LeftPanel() {
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
        <p className="text-sm text-white/70">Trusted by 500+ B2B founders across India</p>
        <div className="relative overflow-hidden h-6">
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {[...COMPANIES, ...COMPANIES].map((co, i) => (
              <span key={`${co}-${i}`} className="text-xs font-medium text-white/50">
                {co}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type View = "picker" | "email" | "otp" | "sso" | "sso-info";

export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signInHook = useSignIn();
  const signUpHook = useSignUp();
  const isSignUp = mode === "sign-up";

  const isLoaded = isSignUp ? signUpHook.isLoaded : signInHook.isLoaded;
  const setActive = isSignUp ? signUpHook.setActive : signInHook.setActive;

  const [view, setView] = useState<View>("picker");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const heading = isSignUp ? "Create your AryaSDR account" : "Welcome to AryaSDR";
  const subtitleByView: Record<View, string> = {
    picker: isSignUp ? "50 free credits to start. No card needed." : "Enter your email to get started",
    email: "Enter your email address",
    otp: `Enter the 6-digit code we sent to ${email}`,
    sso: "Enter your work email to sign in with SSO",
    "sso-info": "Single sign-on is available on Enterprise plans",
  };

  function resetError() {
    if (error) setError("");
  }

  async function handleGoogle() {
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const authenticator = isSignUp ? signUpHook.signUp : signInHook.signIn;
      await authenticator!.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `/${mode}/sso-callback`,
        redirectUrlComplete: isSignUp ? "/onboarding" : "/dashboard",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      setError(msg);
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    if (!isLoaded || !email) return;
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        await signUpHook.signUp!.create({ emailAddress: email });
        await signUpHook.signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      } else {
        const attempt = await signInHook.signIn!.create({ identifier: email });
        const emailFactor = attempt.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code"
        ) as { emailAddressId: string } | undefined;
        if (!emailFactor) throw new Error("Email sign-in not available");
        await signInHook.signIn!.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
      }
      setView("otp");
    } catch (e: unknown) {
      const anyE = e as { errors?: Array<{ message?: string }>; message?: string };
      setError(anyE.errors?.[0]?.message ?? anyE.message ?? "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit() {
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        const attempt = await signUpHook.signUp!.attemptEmailAddressVerification({ code: otp });
        if (attempt.status === "complete") {
          await setActive!({ session: attempt.createdSessionId });
          window.location.href = "/onboarding";
          return;
        }
      } else {
        const attempt = await signInHook.signIn!.attemptFirstFactor({
          strategy: "email_code",
          code: otp,
        });
        if (attempt.status === "complete") {
          await setActive!({ session: attempt.createdSessionId });
          window.location.href = "/dashboard";
          return;
        }
      }
      setError("Verification incomplete");
    } catch (e: unknown) {
      const anyE = e as { errors?: Array<{ message?: string }>; message?: string };
      setError(anyE.errors?.[0]?.message ?? anyE.message ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <LeftPanel />

      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="flex justify-center mb-6">
            <AryaLogo />
          </div>

          <h1 className="text-[28px] font-bold text-gray-900 text-center mb-1">{heading}</h1>
          <p className="text-sm text-gray-500 text-center mb-8">{subtitleByView[view]}</p>

          {view === "picker" && (
            <div className="space-y-3">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#6C47FF] hover:bg-[#5A38E0] text-white h-12 text-sm font-semibold transition-colors disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>
              <button
                onClick={() => setView("email")}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 h-12 text-sm font-semibold transition-colors"
              >
                <Mail className="h-4 w-4" />
                Continue with email
              </button>
              <button
                onClick={() => setView("sso-info")}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 h-12 text-sm font-semibold transition-colors"
              >
                <Key className="h-4 w-4" />
                Single sign-on (SSO)
              </button>
            </div>
          )}

          {view === "email" && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setView("picker");
                  resetError();
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetError();
                }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-gray-200 h-12 px-4 text-sm focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none transition-colors"
              />
              <button
                onClick={handleEmailSubmit}
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6C47FF] hover:bg-[#5A38E0] text-white h-12 text-sm font-semibold disabled:opacity-70 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </button>
              {/* Clerk CAPTCHA element for signup */}
              {isSignUp && <div id="clerk-captcha" />}
            </div>
          )}

          {view === "otp" && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setView("email");
                  setOtp("");
                  resetError();
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Change email
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  resetError();
                }}
                onKeyDown={(e) => e.key === "Enter" && handleOtpSubmit()}
                placeholder="000000"
                className="w-full rounded-xl border border-gray-200 h-14 px-4 text-center text-2xl tracking-[0.5em] font-semibold text-gray-900 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] outline-none transition-colors"
              />
              <button
                onClick={handleOtpSubmit}
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6C47FF] hover:bg-[#5A38E0] text-white h-12 text-sm font-semibold disabled:opacity-70 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </button>
            </div>
          )}

          {view === "sso-info" && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setView("picker");
                  resetError();
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-[#6C47FF]" />
                  <span className="text-sm font-semibold text-gray-900">Enterprise SSO</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Single sign-on with SAML, Okta, or Azure AD is available on our Enterprise
                  plan. Get in touch to enable it for your team.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6C47FF] hover:bg-[#5A38E0] text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Contact sales
                </Link>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}

          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
          </p>

          <p className="text-sm text-gray-500 text-center mt-4">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <Link href="/sign-in" className="text-[#6C47FF] font-semibold hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="text-[#6C47FF] font-semibold hover:underline">
                  Sign up
                </Link>
              </>
            )}
          </p>
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
