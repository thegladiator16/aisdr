"use client";

import { Clock } from "lucide-react";

export function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden mx-4">
        {/* Top illustration */}
        <div className="relative bg-violet-50 px-6 pt-8 pb-6 flex items-center justify-center">
          {/* Chat bubbles */}
          <div className="absolute left-4 top-4 bg-white rounded-lg shadow-sm px-3 py-2 text-xs max-w-[160px]">
            <span className="text-[10px] text-violet-500 font-medium block mb-0.5">
              Drafting
            </span>
            <span className="text-gray-600">
              Hey Vikram, saw your funding announcement...
            </span>
          </div>
          <div className="absolute right-4 top-4 bg-white rounded-lg shadow-sm px-3 py-2 text-xs">
            <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Reply received
            </span>
            <span className="text-gray-600">Daniel Voss, Finova</span>
          </div>
          <div className="absolute right-6 bottom-4 bg-white rounded-lg shadow-sm px-3 py-2 text-xs">
            <span className="flex items-center gap-1 text-[10px] text-violet-500 font-medium mb-0.5">
              Meeting booked
            </span>
            <span className="text-gray-600">Thu 2:30pm</span>
          </div>

          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-[#6C47FF] flex items-center justify-center z-10">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i === 0 ? "bg-violet-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Hi, I&apos;m Arya. Welcome aboard!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            I&apos;ll find your prospects, write your emails, and book your
            meetings while you sleep. Let me show you how it works.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Tour length</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />7 steps, about 30 seconds
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
            >
              Show me around
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
