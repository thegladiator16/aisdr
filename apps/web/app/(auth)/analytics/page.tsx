import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/db/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarChart2, TrendingUp, Mail, CalendarCheck } from "lucide-react";

export default async function AnalyticsPage() {
  let stats = {
    emailsSentToday: 0,
    openRatePercent: 0,
    replyRatePercent: 0,
    meetingsThisMonth: 0,
  };

  try {
    const user = await getCurrentUser();
    if (user) {
      stats = await getDashboardStats(user.id);
    }
  } catch {
    // render with zero stats
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Performance metrics across all your campaigns.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Emails Sent Today" value={stats.emailsSentToday} icon={Mail} />
        <StatCard label="Open Rate (7d)" value={`${stats.openRatePercent}%`} icon={TrendingUp} />
        <StatCard label="Reply Rate (7d)" value={`${stats.replyRatePercent}%`} icon={BarChart2} />
        <StatCard label="Meetings (Month)" value={stats.meetingsThisMonth} icon={CalendarCheck} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-center py-16">
        <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Detailed charts coming soon</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Activity timeline, funnel analysis, and per-campaign breakdowns.
        </p>
      </div>
    </div>
  );
}
