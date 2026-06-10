"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Plus, Upload, X } from "lucide-react";
import { cn, STATUS_COLOR } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type Lead = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  companyName: string | null;
  jobTitle: string | null;
  status: string | null;
  score: number | null;
  country: string | null;
  location: string | null;
};

const STATUSES = [
  "new",
  "researching",
  "ready",
  "in_sequence",
  "replied",
  "meeting_booked",
  "not_interested",
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const json = await res.json();
      setLeads(json.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load leads";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() && !firstName.trim() && !lastName.trim()) {
      toast.error("Provide at least a name or email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          companyName: companyName || undefined,
          jobTitle: jobTitle || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create lead");
      const json = await res.json();
      setLeads((prev) => [json.data, ...prev]);
      toast.success("Lead added");
      setShowForm(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setCompanyName("");
      setJobTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data as Record<string, string>[]).map((row) => ({
            firstName: row.first_name ?? row.firstName ?? row["First Name"],
            lastName: row.last_name ?? row.lastName ?? row["Last Name"],
            fullName: row.full_name ?? row.fullName ?? row["Full Name"],
            email: row.email ?? row.Email,
            companyName: row.company ?? row.company_name ?? row.Company,
            jobTitle: row.title ?? row.job_title ?? row["Job Title"],
          }));

          const res = await fetch("/api/leads/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leads: rows }),
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            throw new Error(errJson?.error ?? "Failed to import leads");
          }
          const json = await res.json();
          toast.success(`Imported ${json.data.imported} of ${json.data.total} leads`);
          await loadLeads();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to import CSV");
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: () => {
        toast.error("Failed to parse CSV file");
        setUploading(false);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Importing..." : "Import CSV"}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add Lead"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border bg-card p-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Company</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Job Title</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Lead"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            !statusFilter
              ? "bg-primary text-white"
              : "border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
              statusFilter === s
                ? "bg-primary text-white"
                : "border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    No leads yet. Use{" "}
                    <span className="text-primary">Import CSV</span> or{" "}
                    <span className="text-primary">Add Lead</span> to get started.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {lead.fullName ?? (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "—")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.country ?? lead.location ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {lead.companyName ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-[180px]">
                      {lead.jobTitle ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {lead.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_COLOR[lead.status ?? "new"] ?? "text-zinc-400 bg-zinc-400/10"
                        )}
                      >
                        {(lead.status ?? "new").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lead.score != null ? (
                        <span
                          className={cn(
                            "font-mono text-xs font-bold",
                            lead.score >= 70
                              ? "text-green-400"
                              : lead.score >= 40
                              ? "text-yellow-400"
                              : "text-red-400"
                          )}
                        >
                          {lead.score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
