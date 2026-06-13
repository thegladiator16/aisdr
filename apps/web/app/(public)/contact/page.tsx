"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

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

      <section className="mx-auto max-w-xl px-6 py-20">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">Talk to Sales</h1>
          <p className="text-zinc-400 mt-3">
            Tell us about your team and we&apos;ll get back to you within one business day.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 text-center">
            <p className="font-semibold text-white">Thanks for reaching out!</p>
            <p className="text-zinc-400 text-sm mt-2">
              Our team will email you shortly to schedule a call.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400">Name</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Work Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Company</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">What are you looking for?</label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 transition-colors"
            >
              Send message
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
