"use client";

import { AryaAvatar } from "./AryaAvatar";
import { cn } from "@/lib/utils";

interface AryaProps {
  size?: "sm" | "md" | "lg" | "xl";
  showBadge?: boolean;
  animated?: boolean;
  showName?: boolean;
  className?: string;
}

export function Arya({
  size = "md",
  showBadge = false,
  animated = false,
  showName = false,
  className,
}: AryaProps) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <AryaAvatar size={size} showBadge={showBadge} animated={animated} />
      {showName && (
        <span className="text-sm font-semibold text-gray-900">Arya</span>
      )}
    </div>
  );
}
