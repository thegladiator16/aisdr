"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Mail, Trash2, Play, Pause, X } from "lucide-react";
import { cn, STATUS_COLOR } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  totalLeads: number | null;
  emailsSent: number | null;
  totalReplies: number | null;
  meetingsBooked: number | null;
  channels: string[] | null;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  async function loadCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to load campaigns");
      const json = await res.json();
      setCampaigns(json.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load campaigns";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          subject: subject || undefined,
          body: body || undefined,
          fromEmail: fromEmail || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      const json = await res.json();
      setCampaigns((prev) => [json.data, ...prev]);
      toast.success("Campaign created");
      setShowForm(false);
      setName("");
      setDescription("");
      setSubject("");
      setBody("");
      setFromEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete campaign");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaign");
    }
  }

  async function handleToggleStatus(c: Campaign) {
    const newStatus = c.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/campaigns/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      const json = await res.json();
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? json.data : x)));
      toast.success(`Campaign ${newStatus === "active" ? "started" : "paused"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaign");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Campaign"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Q1 Outbound - SaaS Founders"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">From Email</label>
              <input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@company.com"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Short description of this campaign"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Quick question about {{company}}"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Hi {{firstName}}, ..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Campaign"}
          </button>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No campaigns yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Create your first campaign to start reaching out to leads automatically.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const replyRate =
              c.emailsSent && c.emailsSent > 0
                ? Math.round(((c.totalReplies ?? 0) / c.emailsSent) * 100)
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
                    {c.totalLeads ?? 0} leads · {(c.channels ?? ["email"]).join(", ")}
                  </div>
                  {c.status === "active" ? (
                    <button
                      onClick={() => handleToggleStatus(c)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pause className="h-3 w-3" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(c)}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-red-400 hover:border-red-400/50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
