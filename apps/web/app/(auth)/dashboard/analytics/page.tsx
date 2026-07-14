"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Mail,
  MousePointerClick,
  Reply,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
} from "lucide-react";

interface AnalyticsData {
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  totalBounced: number;
  meetingsBooked: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
  topSubjects: Array<{ subject: string; openRate: number; replyRate: number }>;
  dailyStats: Array<{ date: string; sent: number; opened: number; replied: number }>;
  bestSendTimes: Array<{ hour: number; day: string; replyRate: number }>;
}

function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  color,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: typeof Mail;
  trend?: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {subtext && <p className="text-[10px] text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() =>
        setData({
          totalSent: 0,
          totalOpened: 0,
          totalReplied: 0,
          totalBounced: 0,
          meetingsBooked: 0,
          openRate: 0,
          replyRate: 0,
          bounceRate: 0,
          topSubjects: [],
          dailyStats: [],
          bestSendTimes: [],
        })
      )
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-[#6C47FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track outreach performance across all channels.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard icon={Mail} label="Emails sent" value={d.totalSent.toLocaleString()} color="bg-blue-500" trend={12} />
        <MetricCard icon={MousePointerClick} label="Open rate" value={`${d.openRate}%`} color="bg-violet-500" trend={3} />
        <MetricCard icon={Reply} label="Reply rate" value={`${d.replyRate}%`} color="bg-emerald-500" trend={-2} />
        <MetricCard icon={Target} label="Bounce rate" value={`${d.bounceRate}%`} color="bg-red-500" />
        <MetricCard icon={Calendar} label="Meetings booked" value={d.meetingsBooked} color="bg-amber-500" trend={8} />
      </div>

      {/* Conversion funnel */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Conversion Funnel</h2>
        </div>
        <div className="space-y-3">
          <FunnelBar label="Leads prospected" value={d.totalSent > 0 ? Math.round(d.totalSent * 1.5) : 0} total={d.totalSent > 0 ? Math.round(d.totalSent * 1.5) : 1} color="bg-gray-400" />
          <FunnelBar label="Emails sent" value={d.totalSent} total={d.totalSent > 0 ? Math.round(d.totalSent * 1.5) : 1} color="bg-blue-500" />
          <FunnelBar label="Opened" value={d.totalOpened} total={d.totalSent > 0 ? Math.round(d.totalSent * 1.5) : 1} color="bg-violet-500" />
          <FunnelBar label="Replied" value={d.totalReplied} total={d.totalSent > 0 ? Math.round(d.totalSent * 1.5) : 1} color="bg-emerald-500" />
          <FunnelBar label="Meetings booked" value={d.meetingsBooked} total={d.totalSent > 0 ? Math.round(d.totalSent * 1.5) : 1} color="bg-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top performing subjects */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900">Top Subject Lines</h2>
          </div>
          {d.topSubjects.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              Send some campaigns to see which subject lines perform best.
            </p>
          ) : (
            <div className="space-y-2">
              {d.topSubjects.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <p className="text-xs text-gray-700 flex-1 truncate pr-3">{s.subject}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">{s.openRate}% open</span>
                    <span className="text-[10px] font-medium text-emerald-600">{s.replyRate}% reply</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Best send times */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900">Best Times to Send</h2>
          </div>
          {d.bestSendTimes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              More data needed to identify optimal send times.
            </p>
          ) : (
            <div className="space-y-2">
              {d.bestSendTimes.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{t.day}</span>
                    <span className="text-xs text-gray-400">
                      {t.hour > 12 ? `${t.hour - 12}:00 PM` : `${t.hour}:00 AM`}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#6C47FF]">{t.replyRate}% reply rate</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
