import Link from "next/link";
import { Zap } from "lucide-react";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-zinc-400">
          We collect only the information needed to provide the AI SDR service, including
          account details, campaign data, and lead information you upload. We do not sell your
          data. Data is stored securely and processed in compliance with GDPR and India&apos;s
          DPDPA.
        </p>
        <p className="text-zinc-400 mt-4">
          For questions about this policy, contact us at support@aisdr.app.
        </p>
      </section>
    </div>
  );
}
