"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ListOrdered, Plus, X, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

type SequenceStep = {
  stepNumber: number;
  channel: "email" | "linkedin_connection" | "linkedin_dm" | "whatsapp";
  delayDays: number;
  subject?: string;
  body?: string;
  condition: "always" | "if_no_reply" | "if_opened";
};

type Sequence = {
  id: string;
  name: string;
  steps: SequenceStep[];
  isActive: boolean | null;
};

type Campaign = {
  id: string;
  name: string;
};

const EMPTY_STEP: SequenceStep = {
  stepNumber: 1,
  channel: "email",
  delayDays: 0,
  subject: "",
  body: "",
  condition: "always",
};

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([{ ...EMPTY_STEP }]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [seqRes, campRes] = await Promise.all([
        fetch("/api/sequences"),
        fetch("/api/campaigns"),
      ]);
      if (!seqRes.ok || !campRes.ok) throw new Error("Failed to load sequences");
      const seqJson = await seqRes.json();
      const campJson = await campRes.json();
      setSequences(seqJson.data);
      setCampaigns(campJson.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sequences";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { ...EMPTY_STEP, stepNumber: prev.length + 1, delayDays: prev.length * 2 },
    ]);
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }))
    );
  }

  function updateStep(index: number, patch: Partial<SequenceStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Sequence name is required");
      return;
    }
    if (!campaignId) {
      toast.error("Select a campaign");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, campaignId, steps }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? "Failed to create sequence");
      }
      const json = await res.json();
      setSequences((prev) => [json.data, ...prev]);
      toast.success("Sequence created");
      setShowForm(false);
      setName("");
      setCampaignId("");
      setSteps([{ ...EMPTY_STEP }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sequence");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sequences.length} sequence{sequences.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Sequence"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="3-step follow up"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Campaign</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {campaigns.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a campaign first.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Steps</label>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add step
              </button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Step {step.stepNumber}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Channel</label>
                    <select
                      value={step.channel}
                      onChange={(e) =>
                        updateStep(i, { channel: e.target.value as SequenceStep["channel"] })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="email">Email</option>
                      <option value="linkedin_connection">LinkedIn Connection</option>
                      <option value="linkedin_dm">LinkedIn DM</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Delay (days)</label>
                    <input
                      type="number"
                      min={0}
                      value={step.delayDays}
                      onChange={(e) => updateStep(i, { delayDays: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Condition</label>
                    <select
                      value={step.condition}
                      onChange={(e) =>
                        updateStep(i, { condition: e.target.value as SequenceStep["condition"] })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="always">Always</option>
                      <option value="if_no_reply">If no reply</option>
                      <option value="if_opened">If opened</option>
                    </select>
                  </div>
                </div>
                {step.channel === "email" && (
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      value={step.subject ?? ""}
                      onChange={(e) => updateStep(i, { subject: e.target.value })}
                      placeholder="Subject"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <textarea
                      value={step.body ?? ""}
                      onChange={(e) => updateStep(i, { body: e.target.value })}
                      placeholder="Body"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Sequence"}
          </button>
        </form>
      )}

      {sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">No sequences yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Create a sequence to automate multi-step outreach for a campaign.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New Sequence
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div key={seq.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">{seq.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {seq.steps.length} steps
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {seq.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {i > 0 && <div className="h-px w-4 bg-border" />}
                    <div className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                      Day {step.delayDays} · {step.channel.replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
