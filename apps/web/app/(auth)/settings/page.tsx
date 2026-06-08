import { requireUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/db/queries";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const subscription = await getUserSubscription(user.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Your Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-foreground">{user.fullName ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Company</dt>
            <dd className="text-foreground">{user.companyName ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Calendar link</dt>
            <dd className="text-foreground">{user.calendarLink ?? "Not set"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Subscription</h2>
        {subscription && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-semibold text-foreground">
                {TIER_LABELS[subscription.tier ?? "free"]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Leads used</span>
              <span className="text-foreground">
                {subscription.leadsUsed ?? 0} / {subscription.leadsLimit}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Emails this month</span>
              <span className="text-foreground">
                {subscription.emailsUsedThisMonth ?? 0} / {subscription.emailsMonthlyLimit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-4 w-4 ${subscription.linkedinEnabled ? "text-green-400" : "text-zinc-600"}`}
              />
              <span className={subscription.linkedinEnabled ? "text-foreground" : "text-muted-foreground"}>
                LinkedIn DMs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-4 w-4 ${subscription.whatsappEnabled ? "text-green-400" : "text-zinc-600"}`}
              />
              <span className={subscription.whatsappEnabled ? "text-foreground" : "text-muted-foreground"}>
                WhatsApp
              </span>
            </div>
          </div>
        )}
        <Link
          href="/settings/billing"
          className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          Manage billing →
        </Link>
      </div>
    </div>
  );
}
