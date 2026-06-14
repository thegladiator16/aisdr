"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem("announcement-dismissed") === "true");
  }, []);

  if (dismissed) return null;

  return (
    <div className="bg-[#6C47FF] text-white text-sm py-2.5 px-6 text-center relative">
      Start free, 50 leads included. No credit card required.
      <Link href="/sign-up" className="underline ml-2 font-medium">
        Get started <ArrowRight className="inline h-3 w-3" />
      </Link>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem("announcement-dismissed", "true");
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
