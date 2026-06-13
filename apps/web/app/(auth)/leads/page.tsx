"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Mail,
  Phone,
  Linkedin,
  Clock,
  Send,
  UserPlus,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { cn, STATUS_COLOR } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  "new",
  "researching",
  "ready",
  "in_sequence",
  "replied",
  "meeting_booked",
  "not_interested",
];

const STATUS_OPTIONS = ["All", "New", "Contacted", "Qualified", "Converted"];
const SORT_OPTIONS = ["Newest first", "Oldest first", "Score: High to Low", "Score: Low to High", "Name A-Z"];
const LEADS_PER_PAGE = 10;

const INTENT_SIGNALS = [
  { label: "Visited pricing page", color: "bg-green-100 text-green-700" },
  { label: "Opened 3 emails", color: "bg-violet-100 text-violet-700" },
  { label: "Downloaded whitepaper", color: "bg-blue-100 text-blue-700" },
  { label: "Attended webinar", color: "bg-yellow-100 text-yellow-700" },
];

const RECENT_ACTIVITY = [
  { time: "2 hours ago", action: "Opened email campaign #4" },
  { time: "1 day ago", action: "Visited product page" },
  { time: "3 days ago", action: "Downloaded case study PDF" },
  { time: "1 week ago", action: "Added to sequence" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-700";
  if (score >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function getLeadName(lead: Lead) {
  return (
    lead.fullName ??
    (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() ||
    "Unknown")
  );
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function LeadsPage() {
  /* ---------- data state ---------- */
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  /* ---------- form / import state ---------- */
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  /* ---------- Arya search state ---------- */
  const [aryaQuery, setAryaQuery] = useState("");

  /* ---------- UI state ---------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusDropdown, setStatusDropdown] = useState("All");
  const [sortDropdown, setSortDropdown] = useState(SORT_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

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
      const message =
        err instanceof Error ? err.message : "Failed to load leads";
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

  /* ---------------------------------------------------------------- */
  /*  Create lead                                                      */
  /* ---------------------------------------------------------------- */

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
      toast.error(
        err instanceof Error ? err.message : "Failed to create lead"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  CSV import                                                       */
  /* ---------------------------------------------------------------- */

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data as Record<string, string>[]).map(
            (row) => ({
              firstName: row.first_name ?? row.firstName ?? row["First Name"],
              lastName: row.last_name ?? row.lastName ?? row["Last Name"],
              fullName: row.full_name ?? row.fullName ?? row["Full Name"],
              email: row.email ?? row.Email,
              companyName: row.company ?? row.company_name ?? row.Company,
              jobTitle: row.title ?? row.job_title ?? row["Job Title"],
            })
          );

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
          toast.success(
            `Imported ${json.data.imported} of ${json.data.total} leads`
          );
          await loadLeads();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Failed to import CSV"
          );
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

  /* ---------------------------------------------------------------- */
  /*  Delete                                                           */
  /* ---------------------------------------------------------------- */

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
      toast.success("Lead deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete lead"
      );
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/leads?id=${id}`, { method: "DELETE" })
        )
      );
      setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
      if (selectedLead && selectedIds.has(selectedLead.id))
        setSelectedLead(null);
      setSelectedIds(new Set());
      toast.success(`Deleted ${ids.length} lead(s)`);
    } catch {
      toast.error("Failed to delete some leads");
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Filtering / sorting / pagination                                 */
  /* ---------------------------------------------------------------- */

  const filtered = leads.filter((lead) => {
    const name = getLeadName(lead).toLowerCase();
    const company = (lead.companyName ?? "").toLowerCase();
    const title = (lead.jobTitle ?? "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q || name.includes(q) || company.includes(q) || title.includes(q);

    const status = (lead.status ?? "new").toLowerCase();
    const matchesStatus =
      statusDropdown === "All" ||
      status.includes(statusDropdown.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortDropdown) {
      case "Score: High to Low":
        return (b.score ?? 0) - (a.score ?? 0);
      case "Score: Low to High":
        return (a.score ?? 0) - (b.score ?? 0);
      case "Name A-Z":
        return getLeadName(a).localeCompare(getLeadName(b));
      default:
        return 0;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / LEADS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice(
    (safePage - 1) * LEADS_PER_PAGE,
    safePage * LEADS_PER_PAGE
  );

  const allOnPageSelected =
    paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((l) => next.add(l.id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6 relative">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {leads.length} leads
          </p>
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
            className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors"
          >
            {showForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {showForm ? "Cancel" : "Add Lead"}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Add Lead Form                                                */}
      {/* ============================================================ */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border bg-white p-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              First Name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Last Name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Company
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Job Title
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Lead"}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/*  "Find Leads with Arya" panel                                 */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-violet-100/60 p-5">
        <div className="flex items-start gap-4">
          <AryaAvatar size="md" />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Find Leads with Arya
              </h2>
              <p className="text-sm text-muted-foreground">
                Let Arya find your ideal prospects
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
                <input
                  value={aryaQuery}
                  onChange={(e) => setAryaQuery(e.target.value)}
                  placeholder="CTOs at Series A fintech startups in Mumbai"
                  className="w-full rounded-lg border border-violet-200 bg-white pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (aryaQuery.trim()) {
                        toast.success("Arya is searching...", {
                          description: `Looking for: "${aryaQuery}"`,
                        });
                      }
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  if (aryaQuery.trim()) {
                    toast.success("Arya is searching...", {
                      description: `Looking for: "${aryaQuery}"`,
                    });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                Find Leads
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Filters row                                                  */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search leads..."
            className="w-full rounded-lg border border-border bg-white pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
          />
        </div>
        <select
          value={statusDropdown}
          onChange={(e) => {
            setStatusDropdown(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <select
          value={sortDropdown}
          onChange={(e) => setSortDropdown(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedIds.size})
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Status pills (existing filter logic)                         */}
      {/* ============================================================ */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            !statusFilter
              ? "bg-[#6C47FF] text-white"
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
                ? "bg-[#6C47FF] text-white"
                : "border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {formatStatus(s)}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  Leads Table                                                  */}
      {/* ============================================================ */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#FAFAFA]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border text-[#6C47FF] focus:ring-[#6C47FF] cursor-pointer accent-[#6C47FF]"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    Intent Score
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Last Activity
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-16 text-muted-foreground"
                  >
                    No leads found. Use{" "}
                    <span className="text-[#6C47FF] font-medium">
                      Import CSV
                    </span>{" "}
                    or{" "}
                    <span className="text-[#6C47FF] font-medium">
                      Add Lead
                    </span>{" "}
                    to get started.
                  </td>
                </tr>
              ) : (
                paginated.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-violet-50/50 transition-colors cursor-pointer"
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="h-4 w-4 rounded border-border text-[#6C47FF] focus:ring-[#6C47FF] cursor-pointer accent-[#6C47FF]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {getLeadName(lead)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.companyName ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-[180px]">
                      {lead.jobTitle ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lead.score != null ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            getScoreColor(lead.score)
                          )}
                        >
                          {lead.score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          STATUS_COLOR[lead.status ?? "new"] ??
                            "text-zinc-500 bg-zinc-100"
                        )}
                      >
                        {formatStatus(lead.status ?? "new")}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {lead.country ?? lead.location ?? "—"}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {sorted.length > LEADS_PER_PAGE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(safePage - 1) * LEADS_PER_PAGE + 1}–
                {Math.min(safePage * LEADS_PER_PAGE, sorted.length)} of{" "}
                {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "inline-flex items-center justify-center h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                        page === safePage
                          ? "bg-[#6C47FF] text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-violet-50"
                      )}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage >= totalPages}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Lead Detail Side Panel                                       */}
      {/* ============================================================ */}
      {selectedLead && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedLead(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-border shadow-xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-foreground">
                Lead Details
              </h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center text-[#6C47FF] font-bold text-lg">
                    {getLeadName(selectedLead).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {getLeadName(selectedLead)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedLead.jobTitle ?? "No title"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedLead.companyName ?? "No company"}
                    </p>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-2">
                  {selectedLead.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground truncate">
                        {selectedLead.email}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Not available</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-[#6C47FF] hover:underline cursor-pointer">
                      View LinkedIn profile
                    </span>
                  </div>
                </div>

                {/* Score */}
                {selectedLead.score != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Intent Score:
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        getScoreColor(selectedLead.score)
                      )}
                    >
                      {selectedLead.score}/100
                    </span>
                  </div>
                )}
              </div>

              {/* Intent Signals */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Intent Signals
                </h4>
                <div className="flex flex-wrap gap-2">
                  {INTENT_SIGNALS.map((signal) => (
                    <span
                      key={signal.label}
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        signal.color
                      )}
                    >
                      {signal.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Recent Activity
                </h4>
                <div className="space-y-3">
                  {RECENT_ACTIVITY.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Notes
                </h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() =>
                    toast.success("Opening email composer...", {
                      description: `To: ${selectedLead.email ?? "no email"}`,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors w-full"
                >
                  <Send className="h-4 w-4" />
                  Send Email
                </button>
                <button
                  onClick={() =>
                    toast.success("Lead added to campaign", {
                      description: getLeadName(selectedLead),
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#6C47FF] px-4 py-2.5 text-sm font-medium text-[#6C47FF] hover:bg-violet-50 transition-colors w-full"
                >
                  <UserPlus className="h-4 w-4" />
                  Add to Campaign
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedLead.id);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
