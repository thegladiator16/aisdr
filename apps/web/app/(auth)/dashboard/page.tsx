import { requireUser } from "@/lib/auth";
import { getDashboardStats, getCampaigns, getUnreadReplies } from "@/lib/db/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { Mail, TrendingUp, MessageSquare, CalendarCheck } from "lucide-react";
import { STATUS_COLOR, SENTIMENT_EMOJI, truncate } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, campaigns, unreadReplies] = await Promise.all([
    getDashboardStats(user.id),
    getCampaigns(user.id),
    getUnreadReplies(user.id, 3),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Good morning{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your outreach today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Emails Sent Today"
          value={stats.emailsSentToday}
          subtext="out of daily limit"
          icon={Mail}
        />
        <StatCard
          label="Open Rate (7d)"
          value={`${stats.openRatePercent}%`}
          subtext="industry avg: 25%"
          icon={TrendingUp}
          trend={
            stats.openRatePercent > 25
              ? { value: stats.openRatePercent - 25, label: "above avg" }
              : undefined
          }
        />
        <StatCard
          label="Reply Rate (7d)"
          value={`${stats.replyRatePercent}%`}
          subtext="industry avg: 3%"
          icon={MessageSquare}
          trend={
            stats.replyRatePercent > 3
              ? { value: Math.round(((stats.replyRatePercent - 3) / 3) * 100), label: "above avg" }
              : undefined
          }
        />
        <StatCard
          label="Meetings This Month"
          value={stats.meetingsThisMonth}
          subtext="booked via AI SDR"
          icon={CalendarCheck}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Active Campaigns</h2>
            <Link href="/campaigns" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {activeCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No active campaigns.{" "}
              <Link href="/campaigns/new" className="text-primary hover:underline">
                Create one →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCampaigns.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.totalLeads} leads · {c.emailsSent} sent
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_COLOR[c.status ?? "draft"]
                      )}
                    >
                      {c.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.totalReplies} replies
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">
              Inbox Preview
              {unreadReplies.length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                  {unreadReplies.length}
                </span>
              )}
            </h2>
            <Link href="/inbox" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {unreadReplies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No unread replies.
            </div>
          ) : (
            <div className="space-y-3">
              {unreadReplies.map((r) => (
                <Link
                  key={r.id}
                  href="/inbox"
                  className="flex items-start gap-3 rounded-lg p-3 hover:bg-accent transition-colors"
                >
                  <span className="text-xl mt-0.5">
                    {SENTIMENT_EMOJI[r.sentiment ?? "neutral"] ?? "📩"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {r.leadId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {truncate(r.body, 80)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.intent ?? "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
