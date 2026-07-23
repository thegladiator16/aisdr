import type { Metadata } from "next";
import Link from 'next/link'
import { ArrowLeft, Rocket } from 'lucide-react'
import { AryaAvatar } from '@/components/arya/AryaAvatar'

export const metadata: Metadata = {
  title: "Startups: Affordable AI SDR",
  description: "AryaSDR for early-stage startups. Get to first 10 meetings without an expensive sales hire.",
};

export default function StartupsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <AryaAvatar size="sm" />
            <span className="font-bold text-gray-900 text-lg">AI SDR</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
            <Rocket className="h-7 w-7 text-[#6C47FF]" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">AI SDR for Startups</h1>
        <p className="text-lg text-gray-500 mt-4 max-w-xl mx-auto">
          Launch and scale your outbound motion without hiring an SDR team.
          Arya helps early-stage startups book meetings from day one.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/sign-up" className="inline-flex items-center justify-center rounded-xl bg-[#6C47FF] px-6 py-3 text-sm font-semibold text-white hover:bg-[#5A38E0] transition-colors">
            Start free trial
          </Link>
          <Link href="/contact" className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Book a demo
          </Link>
        </div>
      </section>
    </div>
  )
}
