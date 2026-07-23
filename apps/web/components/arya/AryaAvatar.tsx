"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: 20,
  sm: 32,
  md: 48,
  lg: 96,
  xl: 200,
} as const;

interface AryaAvatarProps {
  size?: keyof typeof SIZES;
  /**
   * "head" (default for sm/md/lg) — tight circular headshot.
   * "full" (default for xl) — upper-body portrait in a soft violet frame.
   */
  variant?: "head" | "full";
  showBadge?: boolean;
  animated?: boolean;
  className?: string;
}

export function AryaAvatar({
  size = "md",
  variant,
  showBadge = false,
  animated = false,
  className,
}: AryaAvatarProps) {
  const px = SIZES[size];
  const badgeScale = size === "sm" ? 0.6 : size === "md" ? 0.75 : 1;
  const useVariant = variant ?? (size === "xl" ? "full" : "head");

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      {animated && (
        <div
          className="absolute rounded-full bg-violet-500/20 animate-ping pointer-events-none"
          style={{
            width: px,
            height: px,
            left: `calc(50% - ${px / 2}px)`,
            top: 0,
          }}
        />
      )}
      {useVariant === "full" ? (
        <PortraitFull px={px} animated={animated} />
      ) : (
        <PortraitHead px={px} animated={animated} />
      )}
      {showBadge && (
        <span
          className="mt-2 inline-flex items-center rounded-full bg-violet-600 px-2.5 py-0.5 text-white font-semibold whitespace-nowrap shadow-sm"
          style={{ fontSize: 10 * badgeScale, lineHeight: 1.2 }}
        >
          AI BDR
        </span>
      )}
    </div>
  );
}

function PortraitHead({ px, animated }: { px: number; animated: boolean }) {
  return (
    <div
      className={cn(
        "relative z-10 overflow-hidden rounded-full ring-2 ring-violet-200/70 shadow-sm bg-gradient-to-br from-violet-100 to-violet-200",
        animated && "animate-pulse"
      )}
      style={{ width: px, height: px, animationDuration: "3s" }}
    >
      <Image
        src="/arya-human.jpeg"
        alt="Arya, your AI Sales Development Rep"
        width={px * 2}
        height={px * 2}
        priority={px >= 96}
        sizes={`${px}px`}
        className="h-full w-full object-cover object-[50%_18%] scale-[1.35]"
      />
    </div>
  );
}

function PortraitFull({ px, animated }: { px: number; animated: boolean }) {
  const w = px;
  const h = Math.round((px * 620) / 680);
  return (
    <div
      className={cn(
        "relative z-10 overflow-hidden rounded-[28px] ring-1 ring-violet-200/70 shadow-lg bg-gradient-to-br from-violet-100 via-violet-200 to-violet-300",
        animated && "animate-pulse"
      )}
      style={{ width: w, height: h, animationDuration: "3s" }}
    >
      <Image
        src="/arya-human.jpeg"
        alt="Arya, your AI Sales Development Rep"
        width={w * 2}
        height={h * 2}
        priority
        sizes={`${w}px`}
        className="h-full w-full object-cover object-[50%_28%]"
      />
    </div>
  );
}
