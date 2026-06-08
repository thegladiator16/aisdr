import { requireUser } from "@/lib/auth";
import { getUnreadReplies } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { replies, leads } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";
import { SENTIMENT_EMOJI, INTENT_LABEL, truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const URGENCY_COLOR: Record<string, string> = {
  immediate: "text-red-400",
  today: "text-yellow-400",
  this_week: "text-blue-400",
  low: "text-zinc-500",
};

const URGENCY_DOT: Record<string, string> = {
  immediate: "bg-red-400",
  today: "bg-yellow-400",
  this_week: "bg-blue-400",
  low: "bg-zinc-500",
};

export default async function InboxPage() {
  const user = await requireUser();

  const allReplies = await db
    .select({
      reply: replies,
      lead: {
        id: leads.id,
        fullName: leads.fullName,
        companyName: leads.companyName,
        email: leads.email,
        jobTitle: leads.jobTitle,
      },
    })
    .from(replies)
    .leftJoin(leads, eq(replies.leadId, leads.id))
    .where(eq(replies.userId, user.id))
    .orderBy(desc(replies.receivedAt))
    .limit(100);

  const unread = allReplies.filter((r) => !r.reply.isRead);
  const read = allReplies.filter((r) => r.reply.isRead);

  function ReplyCard({ item }: { item: (typeof allReplies)[0] }) {
    const { reply, lead } = item;
    return (
      <div
        className={cn(
          "rounded-xl border p-4 space-y-3 transition-colors",
          !reply.isRead
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-card"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {SENTIMENT_EMOJI[reply.sentiment ?? "neutral"] ?? "📩"}
            </span>
            <div>
              <p className="font-medium text-foreground text-sm">
                {lead?.fullName ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lead?.companyName} · {lead?.jobTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {reply.urgency && (
              <span className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    URGENCY_DOT[reply.urgency]
                  )}
                />
                <span className={URGENCY_COLOR[reply.urgency]}>
                  {reply.urgency.replace("_", " ")}
                </span>
              </span>
            )}
            {reply.intent && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {INTENT_LABEL[reply.intent] ?? reply.intent}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 italic">
          &ldquo;{truncate(reply.body, 200)}&rdquo;
        </p>

        {reply.aiSuggestedReply && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary">AI Suggested Reply:</p>
            <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
              {reply.aiSuggestedReply}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
            Reply
          </button>
          <button className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Mark read
          </button>
          <button className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Remove from sequence
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Inbox
          {unread.length > 0 && (
            <span className="ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
              {unread.length}
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Replies from your outreach campaigns
        </p>
      </div>

      {allReplies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <p className="text-4xl mb-4">📭</p>
          <h2 className="text-lg font-semibold text-foreground">No replies yet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Replies from your campaigns will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8 max-w-3xl">
          {unread.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                Unread ({unread.length})
              </h2>
              {unread.map((item) => (
                <ReplyCard key={item.reply.id} item={item} />
              ))}
            </section>
          )}
          {read.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Earlier ({read.length})
              </h2>
              {read.slice(0, 20).map((item) => (
                <ReplyCard key={item.reply.id} item={item} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
