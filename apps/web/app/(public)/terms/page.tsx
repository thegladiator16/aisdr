import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of AryaSDR. Subscriptions, billing, acceptable use, liability.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">AI SDR</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Back home
          </Link>
        </div>
      </nav>
      <section className="mx-auto max-w-3xl px-6 py-20 prose prose-invert">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-zinc-400">
          By using AI SDR, you agree to use the platform only for legitimate sales outreach and
          to comply with applicable anti-spam and data protection laws (including CAN-SPAM and
          India&apos;s DPDPA) for any leads you contact.
        </p>
        <p className="text-zinc-400 mt-4">
          Subscriptions are billed monthly per the plan you select and can be cancelled at any
          time from your account settings.
        </p>
      </section>
    </div>
  );
}
