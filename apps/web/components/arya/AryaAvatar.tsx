"use client";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: 32,
  md: 48,
  lg: 96,
  xl: 200,
} as const;

interface AryaAvatarProps {
  size?: keyof typeof SIZES;
  showBadge?: boolean;
  animated?: boolean;
  className?: string;
}

export function AryaAvatar({
  size = "md",
  showBadge = false,
  animated = false,
  className,
}: AryaAvatarProps) {
  const px = SIZES[size];
  const badgeScale = size === "sm" ? 0.6 : size === "md" ? 0.75 : 1;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      {animated && (
        <div
          className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping"
          style={{ width: px, height: px }}
        />
      )}
      <svg
        width={px}
        height={px}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("relative z-10", animated && "animate-pulse")}
        style={{ animationDuration: "3s" }}
      >
        <defs>
          <linearGradient id="aryaGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6C47FF" />
            <stop offset="100%" stopColor="#4F35CC" />
          </linearGradient>
          <linearGradient id="aryaShine" x1="60" y1="0" x2="140" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill="url(#aryaGrad)" />
        <circle cx="100" cy="100" r="98" fill="url(#aryaShine)" />
        {/* Head */}
        <ellipse cx="100" cy="78" rx="38" ry="40" fill="white" opacity="0.95" />
        {/* Hair */}
        <path
          d="M62 72c0-22 17-40 38-40s38 18 38 40c0 4-1 8-3 12 2-8 3-12 3-18 0-24-17-42-38-42s-38 18-38 42c0 6 1 10 3 18-2-4-3-8-3-12z"
          fill="white"
          opacity="0.7"
        />
        {/* Eyes */}
        <ellipse cx="85" cy="76" rx="5" ry="5.5" fill="#4F35CC" />
        <ellipse cx="115" cy="76" rx="5" ry="5.5" fill="#4F35CC" />
        <circle cx="87" cy="74" r="1.5" fill="white" />
        <circle cx="117" cy="74" r="1.5" fill="white" />
        {/* Subtle smile */}
        <path
          d="M88 92c4 6 20 6 24 0"
          stroke="#4F35CC"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Body/shoulders */}
        <path
          d="M50 160c0-28 22-44 50-44s50 16 50 44v40H50v-40z"
          fill="white"
          opacity="0.9"
        />
        {/* Collar detail */}
        <path
          d="M80 116l20 14 20-14"
          stroke="#6C47FF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
      </svg>
      {showBadge && (
        <span
          className="mt-1 inline-flex items-center rounded-full bg-violet-600 px-2 py-0.5 text-white font-semibold whitespace-nowrap"
          style={{ fontSize: 10 * badgeScale, lineHeight: 1.2 }}
        >
          AI BDR
        </span>
      )}
    </div>
  );
}
