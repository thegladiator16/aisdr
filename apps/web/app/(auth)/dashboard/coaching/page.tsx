"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  TrendingUp,
  Clock,
  Mail,
  Target,
  Lightbulb,
  ArrowRight,
  Sparkles,
  BarChart3,
} from "lucide-react";

interface CoachingInsight {
  type: "timing" | "subject" | "personalization" | "followup" | "channel";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  metric?: string;
}

interface CoachingData {
  overallScore: number;
  insights: CoachingInsight[];
  weeklyTrend: "improving" | "declining" | "stable";
  topPerformingDay: string | null;
  topPerformingHour: number | null;
  avgResponseTime: string | null;
  recommendations: string[];
}

const IMPACT_COLORS = {
  high: "bg-emerald-50 border-emerald-200 text-emerald-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-gray-50 border-gray-200 text-gray-600",
};

const INSIGHT_ICONS = {
  timing: Clock,
  subject: Mail,
  personalization: Target,
  followup: ArrowRight,
  channel: BarChart3,
};

export default function CoachingPage() {
  const [data, setData] = useState<CoachingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/coaching")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() =>
        setData({
          overallScore: 0,
          insights: [],
          weeklyTrend: "stable",
          topPerformingDay: null,
          topPerformingHour: null,
          avgResponseTime: null,
          recommendations: [
            "Run your first campaign to get personalised coaching from Arya.",
            "Connect your Gmail account to start sending outreach.",
            "Set up email warmup for better deliverability.",
          ],
        })
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = data!;
  const scoreColor =
    d.overallScore >= 70
      ? "text-emerald-600"
      : d.overallScore >= 40
      ? "text-amber-600"
      : "text-red-500";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#6C47FF]" />
          <h1 className="text-xl font-bold text-gray-900">AI Coaching</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Arya analyses your campaigns and gives personalised recommendations to improve performance.
        </p>
      </div>

      {/* Performance score */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Outreach Performance Score</h2>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#6C47FF]" />
            <span className="text-xs text-gray-500">
              {d.weeklyTrend === "improving"
                ? "Improving this week"
                : d.weeklyTrend === "declining"
                ? "Needs attention"
                : "Stable"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={d.overallScore >= 70 ? "#10b981" : d.overallScore >= 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${d.overallScore * 2.64} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{d.overallScore}</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-4">
            {d.topPerformingDay && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Best day</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{d.topPerformingDay}</p>
              </div>
            )}
            {d.topPerformingHour != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Best time</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {d.topPerformingHour > 12 ? `${d.topPerformingHour - 12}:00 PM` : `${d.topPerformingHour}:00 AM`}
                </p>
              </div>
            )}
            {d.avgResponseTime && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Avg response</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{d.avgResponseTime}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      {d.insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights from your campaigns
          </h2>
          {d.insights.map((insight, i) => {
            const InsightIcon = INSIGHT_ICONS[insight.type];
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 ${IMPACT_COLORS[insight.impact]}`}
              >
                <div className="flex items-start gap-3">
                  <InsightIcon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{insight.title}</p>
                    <p className="text-xs mt-0.5 opacity-80">{insight.description}</p>
                    {insight.metric && (
                      <p className="text-xs font-medium mt-1.5">{insight.metric}</p>
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 shrink-0">
                    {insight.impact} impact
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-[#6C47FF]" />
          <h2 className="text-sm font-bold text-gray-900">Recommendations</h2>
        </div>
        <ul className="space-y-2.5">
          {d.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
              <span className="h-5 w-5 rounded-full bg-violet-100 text-[#6C47FF] text-[10px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
