"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, TrendingUp, MessageSquare, CalendarCheck, Plus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Spinner } from "@/components/ui/spinner";
import { cn, STATUS_COLOR } from "@/lib/utils";

type Analytics = {
  totalCampaigns: number;
  totalLeads: number;
  emailsSent: number;
  avgOpenRate: number;
  avgReplyRate: number;
  meetingsBooked: number;
};

type Campaign = {
  id: string;
  name: string;
  status: string | null;
  totalLeads: number | null;
  emailsSent: number | null;
  totalReplies: number | null;
};

export function DashboardClient() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, campaignsRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/campaigns"),
        ]);

        if (!analyticsRes.ok || !campaignsRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const analyticsJson = await analyticsRes.json();
        const campaignsJson = await campaignsRes.json();

        if (cancelled) return;
        setAnalytics(analyticsJson.data);
        setCampaigns(campaignsJson.data);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  const stats = analytics ?? {
    totalCampaigns: 0,
    totalLeads: 0,
    emailsSent: 0,
    avgOpenRate: 0,
    avgReplyRate: 0,
    meetingsBooked: 0,
  };

  const activeCampaigns = campaigns.filter((c) => c.status === "active");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Campaigns"
          value={stats.totalCampaigns}
          subtext={`${stats.totalLeads} total leads`}
          icon={Mail}
        />
        <StatCard
          label="Emails Sent"
          value={stats.emailsSent}
          subtext="all time"
          icon={TrendingUp}
        />
        <StatCard
          label="Avg Open / Reply Rate"
          value={`${stats.avgOpenRate}% / ${stats.avgReplyRate}%`}
          subtext="across all campaigns"
          icon={MessageSquare}
        />
        <StatCard
          label="Meetings Booked"
          value={stats.meetingsBooked}
          subtext="all time"
          icon={CalendarCheck}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Active Campaigns</h2>
          <Link href="/campaigns" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        {activeCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No active campaigns yet.</p>
            <Link
              href="/campaigns"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create a campaign
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
                    {c.totalLeads ?? 0} leads · {c.emailsSent ?? 0} sent
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
                    {c.totalReplies ?? 0} replies
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
