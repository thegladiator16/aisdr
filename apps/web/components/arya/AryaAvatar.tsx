"use client";

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
   * "head" (default for sm/md/lg) — just the friendly screen face.
   * "full" (default for xl) — full body chibi robot.
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
  const uid = size + "-" + useVariant;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      {animated && (
        <div
          className="absolute rounded-full bg-violet-500/20 animate-ping"
          style={{ width: px, height: px, left: `calc(50% - ${px / 2}px)`, top: 0 }}
        />
      )}
      {useVariant === "full" ? (
        <RobotFull px={px} uid={uid} animated={animated} />
      ) : (
        <RobotHead px={px} uid={uid} animated={animated} />
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

function RobotHead({ px, uid, animated }: { px: number; uid: string; animated: boolean }) {
  const gradId = `screenGrad-${uid}`;
  return (
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
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6C47FF" />
        </linearGradient>
      </defs>
      {/* Antenna */}
      <line x1="100" y1="35" x2="100" y2="18" stroke="#6C47FF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="14" r="6" fill="#EC4899" />
      <circle cx="98" cy="12" r="2" fill="#FBCFE8" />
      {/* Side buttons */}
      <rect x="14" y="88" width="12" height="30" rx="6" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="2" />
      <rect x="174" y="88" width="12" height="30" rx="6" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="2" />
      {/* Head casing */}
      <rect x="26" y="38" width="148" height="145" rx="30" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3" />
      {/* Top status LED strip */}
      <rect x="82" y="48" width="36" height="4" rx="2" fill="#6C47FF" opacity="0.35" />
      {/* Screen face */}
      <rect x="42" y="60" width="116" height="100" rx="18" fill={`url(#${gradId})`} />
      {/* Screen highlight */}
      <ellipse cx="100" cy="72" rx="45" ry="7" fill="white" opacity="0.18" />
      {/* Left eye */}
      <circle cx="76" cy="105" r="16" fill="white" />
      <circle cx="79" cy="108" r="9" fill="#2D1B69" />
      <circle cx="76" cy="103" r="3.5" fill="white" />
      <circle cx="83" cy="112" r="1.8" fill="white" />
      {/* Right eye */}
      <circle cx="124" cy="105" r="16" fill="white" />
      <circle cx="121" cy="108" r="9" fill="#2D1B69" />
      <circle cx="124" cy="103" r="3.5" fill="white" />
      <circle cx="117" cy="112" r="1.8" fill="white" />
      {/* Cheek blushes */}
      <circle cx="54" cy="130" r="5" fill="#EC4899" opacity="0.55" />
      <circle cx="146" cy="130" r="5" fill="#EC4899" opacity="0.55" />
      {/* Smile */}
      <path
        d="M 82 140 Q 100 155 118 140"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RobotFull({ px, uid, animated }: { px: number; uid: string; animated: boolean }) {
  const gradId = `screenGrad-full-${uid}`;
  return (
    <svg
      width={px}
      height={(px * 620) / 680}
      viewBox="0 0 680 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("relative z-10", animated && "animate-pulse")}
      style={{ animationDuration: "3s" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6C47FF" />
        </linearGradient>
      </defs>
      {/* Antenna */}
      <line x1="340" y1="90" x2="340" y2="50" stroke="#6C47FF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="340" cy="42" r="12" fill="#EC4899" />
      <circle cx="335" cy="37" r="4" fill="#FBCFE8" />
      {/* Ear buttons */}
      <rect x="178" y="180" width="30" height="70" rx="12" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3" />
      <circle cx="193" cy="215" r="6" fill="#6C47FF" />
      <rect x="472" y="180" width="30" height="70" rx="12" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3" />
      <circle cx="487" cy="215" r="6" fill="#6C47FF" />
      {/* Head casing */}
      <rect x="200" y="90" width="280" height="260" rx="48" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3.5" />
      <rect x="315" y="105" width="50" height="8" rx="4" fill="#6C47FF" opacity="0.35" />
      {/* Screen face */}
      <rect x="228" y="130" width="224" height="185" rx="32" fill={`url(#${gradId})`} />
      <ellipse cx="340" cy="150" rx="90" ry="14" fill="white" opacity="0.18" />
      {/* Eyes */}
      <circle cx="292" cy="210" r="30" fill="white" />
      <circle cx="297" cy="215" r="17" fill="#2D1B69" />
      <circle cx="292" cy="208" r="6" fill="white" />
      <circle cx="303" cy="222" r="3" fill="white" />
      <circle cx="388" cy="210" r="30" fill="white" />
      <circle cx="383" cy="215" r="17" fill="#2D1B69" />
      <circle cx="378" cy="208" r="6" fill="white" />
      <circle cx="389" cy="222" r="3" fill="white" />
      {/* Cheeks */}
      <circle cx="255" cy="245" r="8" fill="#EC4899" opacity="0.55" />
      <circle cx="425" cy="245" r="8" fill="#EC4899" opacity="0.55" />
      {/* Smile */}
      <path
        d="M 300 273 Q 340 300 380 273"
        stroke="white"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Neck */}
      <rect x="315" y="350" width="50" height="24" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3" />
      {/* Body */}
      <rect x="220" y="374" width="240" height="175" rx="34" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3.5" />
      {/* Chest panel */}
      <rect x="264" y="410" width="152" height="88" rx="18" fill="#6C47FF" />
      <circle cx="298" cy="454" r="7" fill="#EC4899" />
      <circle cx="340" cy="454" r="7" fill="#FBCFE8" />
      <circle cx="382" cy="454" r="7" fill="#EC4899" />
      <path
        d="M 285 480 L 295 475 L 305 483 L 315 470 L 325 485 L 335 472 L 345 484 L 355 471 L 365 483 L 375 476 L 385 481 L 395 478"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Arms */}
      <rect x="170" y="390" width="42" height="115" rx="21" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3" />
      <circle cx="191" cy="520" r="22" fill="#6C47FF" />
      <rect x="468" y="390" width="42" height="115" rx="21" fill="#F3EEFF" stroke="#6C47FF" strokeWidth="3" />
      <circle cx="489" cy="520" r="22" fill="#6C47FF" />
      {/* Feet */}
      <ellipse cx="285" cy="572" rx="42" ry="20" fill="#6C47FF" />
      <ellipse cx="395" cy="572" rx="42" ry="20" fill="#6C47FF" />
      {/* Ground shadow */}
      <ellipse cx="340" cy="597" rx="180" ry="6" fill="#6C47FF" opacity="0.1" />
    </svg>
  );
}
