"use client";

import { useState } from "react";
import Link from "next/link";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { CheckCircle2 } from "lucide-react";

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "aol.com", "protonmail.com", "zoho.com",
  "mail.com", "ymail.com", "live.com", "msn.com",
  "rediffmail.com", "yandex.com", "inbox.com",
];

function isPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return PERSONAL_EMAIL_DOMAINS.includes(domain);
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function validateEmail(value: string) {
    setEmail(value);
    if (value && isPersonalEmail(value)) {
      setEmailError(
        "Please use your work email (e.g. name@yourcompany.com). We don't accept Gmail, Yahoo, or other personal email addresses."
      );
    } else {
      setEmailError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPersonalEmail(email)) {
      setEmailError(
        "Please use your work email (e.g. name@yourcompany.com). We don't accept Gmail, Yahoo, or other personal email addresses."
      );
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <AryaAvatar size="sm" />
            <span className="font-semibold text-gray-900">AI SDR</span>
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to home
          </Link>
        </nav>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F3FF]">
              <CheckCircle2 className="h-8 w-8 text-[#6C47FF]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Thanks for reaching out!</h2>
            <p className="text-gray-500 mt-3">
              We&apos;ll be in touch within 1 business day.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-[#6C47FF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5538DD] transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <AryaAvatar size="sm" />
          <span className="font-semibold text-gray-900">AI SDR</span>
        </Link>
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          &larr; Back to home
        </Link>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Left Column */}
          <div className="pt-4">
            <h1 className="text-3xl font-bold text-[#111827]">Talk to Sales</h1>
            <p className="text-gray-500 mt-3 leading-relaxed">
              Tell us about your team and we&apos;ll get back to you within one business day.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#6C47FF] shrink-0" />
                <span className="text-sm text-gray-700">Response within 1 business day</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#6C47FF] shrink-0" />
                <span className="text-sm text-gray-700">Custom onboarding included</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#6C47FF] shrink-0" />
                <span className="text-sm text-gray-700">No credit card needed to start</span>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-3">
              <AryaAvatar size="lg" />
              <div>
                <p className="font-semibold text-gray-900">Meet Arya</p>
                <p className="text-sm text-gray-500">Your AI SDR, ready to help</p>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-[#6C47FF] transition-colors"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => validateEmail(e.target.value)}
                  className={`w-full rounded-lg border bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#111827] focus:outline-none focus:ring-2 transition-colors ${
                    emailError
                      ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-[#6C47FF] focus:border-[#6C47FF]"
                  }`}
                  placeholder="you@yourcompany.com"
                />
                {emailError && (
                  <p className="text-red-600 text-sm mt-1">{emailError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
                <input
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-[#6C47FF] transition-colors"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">What are you looking for?</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6C47FF] focus:border-[#6C47FF] transition-colors resize-none"
                  placeholder="Tell us about your outbound goals..."
                />
              </div>
              <button
                type="submit"
                disabled={loading || !!emailError}
                className="w-full rounded-lg bg-[#6C47FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5538DD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send message"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                By submitting, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
