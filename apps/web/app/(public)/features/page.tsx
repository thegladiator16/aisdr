import type { Metadata } from "next";
import Link from 'next/link'
import { ArrowLeft, Zap, Users, Mail, Calendar } from 'lucide-react'
import { AryaAvatar } from '@/components/arya/AryaAvatar'

export const metadata: Metadata = {
  title: "Features",
  description: "Everything AryaSDR does: lead discovery, personalized outreach, multi-channel sequences, intent signals, inbox AI, analytics.",
};

// Fully static — regenerate at most once an hour. Marketing copy doesn't
// change per user or per session, so serve straight from the Vercel edge.
export const revalidate = 3600;

const FEATURES = [
  {
    id: 'leads',
    icon: Users,
    iconColor: 'text-blue-500 bg-blue-50',
    title: 'Find your ideal leads',
    desc: 'Search 250M+ verified B2B contacts. Arya enriches each prospect using 15+ data sources and prioritizes by intent signals like funding rounds, new hires, and tech stack changes.',
  },
  {
    id: 'campaigns',
    icon: Mail,
    iconColor: 'text-emerald-500 bg-emerald-50',
    title: 'Run autonomous campaigns',
    desc: 'Multi-step email and WhatsApp sequences that adapt based on prospect engagement. A/Z test subject lines, send times, and messaging automatically.',
  },
  {
    id: 'meetings',
    icon: Calendar,
    iconColor: 'text-amber-500 bg-amber-50',
    title: 'Book meetings on autopilot',
    desc: 'Arya reads every reply, classifies intent, drafts contextual responses, and schedules meetings directly in your calendar. No manual follow-up needed.',
  },
]

export default function FeaturesPage() {
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

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
            <Zap className="h-7 w-7 text-[#6C47FF]" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">Meet Arya, the AI BDR</h1>
        <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
          Put your outbound on autopilot. Arya finds leads, writes personalized outreach,
          handles replies, and books meetings at a fraction of the cost of a human SDR.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20 space-y-8">
        {FEATURES.map((f) => (
          <div key={f.id} id={f.id} className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm scroll-mt-24">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.iconColor} shrink-0`}>
                <f.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{f.title}</h2>
                <p className="text-gray-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-[#6C47FF] py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Ready to put outbound on autopilot?</h2>
        <p className="text-violet-200 mt-3">Start free. 50 leads included. No credit card needed.</p>
        <Link
          href="/sign-up"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#6C47FF] hover:bg-gray-100 transition-colors"
        >
          Start free trial
        </Link>
      </section>
    </div>
  )
}
