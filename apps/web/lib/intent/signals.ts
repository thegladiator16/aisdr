export interface IntentSignal {
  type: "funding" | "hiring" | "launch" | "leadership" | "expansion";
  description: string;
  date: string;
  source: string;
  score: number;
}

export const SIGNAL_LABELS: Record<IntentSignal["type"], string> = {
  funding: "Raised Funding",
  hiring: "Actively Hiring",
  launch: "New Product Launch",
  leadership: "Leadership Change",
  expansion: "Market Expansion",
};

export const SIGNAL_COLORS: Record<IntentSignal["type"], string> = {
  funding: "bg-violet-50 text-violet-700 border-violet-200",
  hiring: "bg-violet-50 text-violet-700 border-violet-200",
  launch: "bg-violet-50 text-violet-700 border-violet-200",
  leadership: "bg-amber-50 text-amber-700 border-amber-200",
  expansion: "bg-violet-50 text-violet-700 border-violet-200",
};

export function getIntentScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-600 bg-emerald-50";
  if (score >= 5) return "text-amber-600 bg-amber-50";
  return "text-gray-500 bg-gray-50";
}
