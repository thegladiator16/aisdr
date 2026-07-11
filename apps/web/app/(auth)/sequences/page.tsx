"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { toast } from "sonner";
import { ListOrdered, Plus, X, Trash2, Pencil, Pause, Play, Loader2, FlaskConical, Save } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

type MessageVariant = {
  id: string;
  sequenceId: string;
  stepNumber: number;
  variantKey: string;
  subject: string | null;
  body: string | null;
  isActive: boolean | null;
  impressionCount: number;
  positiveResponseCount: number;
};

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
  campaignId: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [variants, setVariants] = useState<MessageVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantDrafts, setVariantDrafts] = useState<
    Record<string, { subject: string; body: string; variantKey: string }>
  >({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

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

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setCampaignId("");
    setSteps([{ ...EMPTY_STEP }]);
    setVariants([]);
    setVariantDrafts({});
  }

  const loadVariants = useCallback(async (sequenceId: string) => {
    setVariantsLoading(true);
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/variants`);
      if (!res.ok) {
        toast.error("Could not load variants");
        return;
      }
      const json = await res.json();
      setVariants(json.data as MessageVariant[]);
    } catch {
      toast.error("Could not load variants");
    } finally {
      setVariantsLoading(false);
    }
  }, []);

  function openEdit(seq: Sequence) {
    setEditingId(seq.id);
    setName(seq.name);
    setCampaignId(seq.campaignId ?? "");
    setSteps(seq.steps.length > 0 ? seq.steps : [{ ...EMPTY_STEP }]);
    setShowForm(true);
    loadVariants(seq.id);
  }

  async function handleAddVariant(stepNumber: number) {
    if (!editingId) return;
    // Assign next unused key from A..Z.
    const usedKeys = new Set(
      variants.filter((v) => v.stepNumber === stepNumber).map((v) => v.variantKey)
    );
    let nextKey = "A";
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      if (!usedKeys.has(c)) {
        nextKey = c;
        break;
      }
    }
    try {
      const res = await fetch(`/api/sequences/${editingId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepNumber,
          variantKey: nextKey,
          subject: "",
          body: "",
        }),
      });
      if (!res.ok) {
        toast.error("Could not add variant");
        return;
      }
      const json = await res.json();
      setVariants((prev) => [...prev, json.data as MessageVariant]);
      toast.success(`Variant ${nextKey} added`);
    } catch {
      toast.error("Could not add variant");
    }
  }

  function beginEditVariant(v: MessageVariant) {
    setVariantDrafts((prev) => ({
      ...prev,
      [v.id]: {
        variantKey: v.variantKey,
        subject: v.subject ?? "",
        body: v.body ?? "",
      },
    }));
  }

  function updateVariantDraft(
    id: string,
    patch: Partial<{ subject: string; body: string; variantKey: string }>
  ) {
    setVariantDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { subject: "", body: "", variantKey: "" }), ...patch },
    }));
  }

  async function handleSaveVariant(v: MessageVariant) {
    if (!editingId) return;
    const draft = variantDrafts[v.id];
    if (!draft) return;
    setSavingVariantId(v.id);
    try {
      const res = await fetch(
        `/api/sequences/${editingId}/variants/${v.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantKey: draft.variantKey,
            subject: draft.subject,
            body: draft.body,
          }),
        }
      );
      if (!res.ok) {
        toast.error("Could not save variant");
        return;
      }
      const json = await res.json();
      setVariants((prev) =>
        prev.map((x) => (x.id === v.id ? (json.data as MessageVariant) : x))
      );
      setVariantDrafts((prev) => {
        const next = { ...prev };
        delete next[v.id];
        return next;
      });
      toast.success("Variant saved");
    } catch {
      toast.error("Could not save variant");
    } finally {
      setSavingVariantId(null);
    }
  }

  async function handleDeleteVariant(v: MessageVariant) {
    if (!editingId) return;
    if (!confirm(`Delete variant ${v.variantKey}?`)) return;
    setSavingVariantId(v.id);
    try {
      const res = await fetch(
        `/api/sequences/${editingId}/variants/${v.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Could not delete variant");
        return;
      }
      setVariants((prev) => prev.filter((x) => x.id !== v.id));
      toast.success("Variant deleted");
    } catch {
      toast.error("Could not delete variant");
    } finally {
      setSavingVariantId(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Sequence name is required");
      return;
    }
    if (!editingId && !campaignId) {
      toast.error("Select a campaign");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        editingId ? `/api/sequences/${editingId}` : "/api/sequences",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId ? { name, steps } : { name, campaignId, steps }
          ),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? "Failed to save sequence");
      }
      const json = await res.json();
      if (editingId) {
        setSequences((prev) => prev.map((s) => (s.id === editingId ? json.data : s)));
        toast.success("Sequence updated");
      } else {
        setSequences((prev) => [json.data, ...prev]);
        toast.success("Sequence created");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save sequence");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(seq: Sequence) {
    setBusyId(seq.id);
    try {
      const res = await fetch(`/api/sequences/${seq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !seq.isActive }),
      });
      if (!res.ok) {
        toast.error("Could not update sequence");
        return;
      }
      const json = await res.json();
      setSequences((prev) => prev.map((s) => (s.id === seq.id ? json.data : s)));
      toast.success(json.data.isActive ? "Sequence activated" : "Sequence paused");
    } catch {
      toast.error("Could not update sequence");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(seq: Sequence) {
    if (!confirm(`Delete "${seq.name}"? This cannot be undone.`)) return;
    setBusyId(seq.id);
    try {
      const res = await fetch(`/api/sequences/${seq.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete sequence");
        return;
      }
      setSequences((prev) => prev.filter((s) => s.id !== seq.id));
      toast.success("Sequence deleted");
    } catch {
      toast.error("Could not delete sequence");
    } finally {
      setBusyId(null);
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
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
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
                disabled={!!editingId}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              >
                <option value="">Select a campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {campaigns.length === 0 && !editingId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a campaign first.
                </p>
              )}
              {editingId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Campaign can&apos;t be changed after creation.
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
            {submitting
              ? editingId
                ? "Saving..."
                : "Creating..."
              : editingId
              ? "Save Changes"
              : "Create Sequence"}
          </button>

          {editingId && (
            <div className="mt-4 rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  A/Z variants
                </h3>
                <span className="text-xs text-muted-foreground">
                  Winner is auto-selected at send time (90% best-so-far, 10%
                  explore).
                </span>
              </div>

              {variantsLoading ? (
                <p className="text-xs text-muted-foreground">Loading variants...</p>
              ) : (
                steps.map((step) => {
                  const stepVariants = variants
                    .filter((v) => v.stepNumber === step.stepNumber)
                    .sort((a, b) => a.variantKey.localeCompare(b.variantKey));
                  return (
                    <div key={step.stepNumber} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          Step {step.stepNumber} · {step.channel.replace("_", " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(step.stepNumber)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Plus className="h-3 w-3" />
                          Add variant
                        </button>
                      </div>
                      {stepVariants.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No variants yet. The step&apos;s default subject/body will
                          be used until you add at least one.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {stepVariants.map((v) => {
                            const draft = variantDrafts[v.id];
                            const posRate =
                              v.impressionCount > 0
                                ? (v.positiveResponseCount / v.impressionCount) *
                                  100
                                : 0;
                            return (
                              <div
                                key={v.id}
                                className="rounded-md border border-border bg-background p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                      {v.variantKey}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {v.impressionCount} sent ·{" "}
                                      {posRate.toFixed(1)}% positive
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!draft && (
                                      <button
                                        type="button"
                                        onClick={() => beginEditVariant(v)}
                                        className="text-muted-foreground hover:text-foreground"
                                        title="Edit variant"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {draft && (
                                      <button
                                        type="button"
                                        disabled={savingVariantId === v.id}
                                        onClick={() => handleSaveVariant(v)}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                                      >
                                        <Save className="h-3 w-3" />
                                        {savingVariantId === v.id ? "Saving..." : "Save"}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={savingVariantId === v.id}
                                      onClick={() => handleDeleteVariant(v)}
                                      className="text-muted-foreground hover:text-red-500 disabled:opacity-50"
                                      title="Delete variant"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {draft ? (
                                  <div className="space-y-2">
                                    <input
                                      value={draft.variantKey}
                                      maxLength={20}
                                      onChange={(e) =>
                                        updateVariantDraft(v.id, {
                                          variantKey: e.target.value,
                                        })
                                      }
                                      placeholder="Variant key (e.g. A)"
                                      className="w-24 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <input
                                      value={draft.subject}
                                      onChange={(e) =>
                                        updateVariantDraft(v.id, {
                                          subject: e.target.value,
                                        })
                                      }
                                      placeholder="Subject"
                                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <textarea
                                      value={draft.body}
                                      onChange={(e) =>
                                        updateVariantDraft(v.id, {
                                          body: e.target.value,
                                        })
                                      }
                                      rows={3}
                                      placeholder="Body"
                                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {v.subject && (
                                      <p className="text-xs font-medium text-foreground truncate">
                                        {v.subject}
                                      </p>
                                    )}
                                    {v.body && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                                        {v.body}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
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
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">{seq.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      seq.isActive
                        ? "bg-green-500/10 text-green-600"
                        : "bg-gray-500/10 text-muted-foreground"
                    }`}
                  >
                    {seq.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {seq.steps.length} steps
                  </span>
                  <button
                    onClick={() => handleToggleActive(seq)}
                    disabled={busyId === seq.id}
                    title={seq.isActive ? "Pause sequence" : "Activate sequence"}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {busyId === seq.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : seq.isActive ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(seq)}
                    title="Edit sequence"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(seq)}
                    disabled={busyId === seq.id}
                    title="Delete sequence"
                    className="text-muted-foreground hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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
