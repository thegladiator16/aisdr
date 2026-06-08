import { requireUser } from "@/lib/auth";
import { getCampaigns } from "@/lib/db/queries";
import Link from "next/link";
import { cn, STATUS_COLOR } from "@/lib/utils";
import { Plus, Play, Pause, Mail, MessageSquare, CalendarCheck } from "lucide-react";

export default async function CampaignsPage() {
  const user = await requireUser();
  const campaigns = await getCampaigns(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No campaigns yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Create your first campaign to start reaching out to leads automatically.
          </p>
          <Link
            href="/campaigns/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const replyRate =
              c.emailsSent && c.emailsSent > 0
                ? Math.round((c.totalReplies! / c.emailsSent) * 100)
                : 0;

            return (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {c.name}
                    </Link>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_COLOR[c.status ?? "draft"]
                    )}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 my-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{c.emailsSent ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Sent</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <p className="text-xl font-bold text-foreground">{replyRate}%</p>
                    <p className="text-xs text-muted-foreground">Reply rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{c.meetingsBooked ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Meetings</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-muted-foreground">
                    {c.totalLeads ?? 0} leads · {(c.channels as string[]).join(", ")}
                  </div>
                  {c.status === "active" ? (
                    <form action={`/api/v1/campaigns/${c.id}`} method="PATCH">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pause className="h-3 w-3" />
                        Pause
                      </button>
                    </form>
                  ) : c.status === "draft" || c.status === "paused" ? (
                    <form action={`/api/v1/campaigns/${c.id}`} method="PATCH">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Play className="h-3 w-3" />
                        Start
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
