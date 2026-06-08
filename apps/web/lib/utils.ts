import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export const SENTIMENT_EMOJI: Record<string, string> = {
  very_positive: "🤝",
  positive: "😊",
  neutral: "😐",
  negative: "😕",
  very_negative: "😡",
};

export const INTENT_LABEL: Record<string, string> = {
  interested: "Interested",
  not_interested: "Not Interested",
  ask_more_info: "Needs Info",
  schedule_meeting: "Wants Meeting",
  unsubscribe: "Unsubscribe",
  out_of_office: "Out of Office",
  referral: "Referral",
};

export const STATUS_COLOR: Record<string, string> = {
  active: "text-green-400 bg-green-400/10",
  paused: "text-yellow-400 bg-yellow-400/10",
  draft: "text-zinc-400 bg-zinc-400/10",
  completed: "text-blue-400 bg-blue-400/10",
  archived: "text-zinc-600 bg-zinc-600/10",
};
