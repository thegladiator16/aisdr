"use client";

import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  ListPlus,
  Loader2,
  Wand2,
  AlertTriangle,
  Tag,
  Download,
  Megaphone,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Save,
  Building2,
} from "lucide-react";
import { cn, STATUS_COLOR } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { notifyCreditsUpdated } from "@/lib/hooks/useSubscription";

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
  tags?: string[] | null;
  createdAt?: string | null;
};

type CampaignSummary = { id: string; name: string };

const BULK_STATUS_OPTIONS = [
  "new",
  "contacted",
  "replied",
  "meeting_booked",
  "not_interested",
];

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

type TimelineEvent =
  | { type: "lead_created"; when: string }
  | { type: "outreach_sent"; when: string; id: string; channel: string; subject: string | null; body: string; opens: number; replies: number; status: string | null }
  | { type: "reply_received"; when: string; id: string; channel: string; subject: string | null; body: string; sentiment: string | null; intent: string | null }
  | { type: "task"; when: string; id: string; taskType: string | null; message: string | null; status: string | null };

type LeadDetail = {
  id: string;
  phone: string | null;
  linkedinUrl: string | null;
  companyWebsite: string | null;
  industry: string | null;
  companySize: string | null;
  researchSummary: string | null;
  notes: string | null;
  tags: string[];
  icebreakers: string[];
};

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
  const router = useRouter();

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

  /* ---------- lead detail / timeline state ---------- */
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [singleCampaignMenuOpen, setSingleCampaignMenuOpen] = useState(false);
  const [singleEnrolling, setSingleEnrolling] = useState<string | null>(null);
  const singleCampaignMenuRef = useRef<HTMLDivElement | null>(null);

  /* ---------- enrichment state ---------- */
  const [enrichmentStatus, setEnrichmentStatus] = useState<{
    providerName: string;
    providerConfigured: boolean;
  } | null>(null);
  const [enriching, setEnriching] = useState(false);

  /* ---------- add-to-list menu state ---------- */
  const [listsMenuOpen, setListsMenuOpen] = useState(false);
  const [availableLists, setAvailableLists] = useState<
    { id: string; name: string }[]
  >([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const listsMenuRef = useRef<HTMLDivElement | null>(null);

  /* ---------- bulk-action menu state ---------- */
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState<
    CampaignSummary[]
  >([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState<
    null | "enroll" | "status" | "tag"
  >(null);
  const campaignMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const tagMenuRef = useRef<HTMLDivElement | null>(null);

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

  /* Fetch enrichment provider status once — used by the sidepanel banner.
     Public endpoint, so no auth handshake needed. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/enrichment/status");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setEnrichmentStatus({
            providerName: json.providerName ?? "none",
            providerConfigured: !!json.providerConfigured,
          });
        }
      } catch {
        /* soft-fail — banner just won't render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Enrich                                                           */
  /* ---------------------------------------------------------------- */

  async function handleEnrich(leadId: string) {
    setEnriching(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/enrich`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);

      if (res.status === 503) {
        // Honest "not configured" state — surface the friendly banner copy
        // as a toast in case the user didn't see the banner.
        setEnrichmentStatus({
          providerName: json?.providerName ?? "none",
          providerConfigured: false,
        });
        toast.error("Enrichment provider not configured", {
          description:
            "Set ENRICHMENT_PROVIDER env var. Manual research still works via the notes field.",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error ?? "Enrichment failed");
      }

      // Re-sync just the row we changed instead of refetching the full list.
      await loadLeads();

      if (json?.updated) {
        const fields: string[] = Array.isArray(json.updatedFields)
          ? json.updatedFields
          : [];
        toast.success("Lead enriched", {
          description: fields.length
            ? `Updated: ${fields.join(", ")}`
            : "Provider returned data",
        });
      } else {
        toast.info("No new data from provider", {
          description: "Provider had no additional info for this lead.",
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to enrich lead"
      );
    } finally {
      setEnriching(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Lead detail / timeline                                          */
  /* ---------------------------------------------------------------- */

  const loadLeadDetail = useCallback(async (leadId: string) => {
    setLoadingDetail(true);
    setLeadDetail(null);
    setTimeline([]);
    try {
      const res = await fetch(`/api/leads/${leadId}/timeline`);
      if (!res.ok) return;
      const json = await res.json();
      setLeadDetail({
        id: json.lead.id,
        phone: json.lead.phone ?? null,
        linkedinUrl: json.lead.linkedinUrl ?? null,
        companyWebsite: json.lead.companyWebsite ?? null,
        industry: json.lead.industry ?? null,
        companySize: json.lead.companySize ?? null,
        researchSummary: json.lead.researchSummary ?? null,
        notes: json.lead.notes ?? null,
        tags: json.lead.tags ?? [],
        icebreakers: json.lead.icebreakers ?? [],
      });
      setNotes(json.lead.notes ?? "");
      setTimeline(json.timeline ?? []);
    } catch {
      /* soft-fail */
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  async function saveNotes() {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/timeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleEnrollSingleCampaign(campaignId: string, campaignName: string) {
    if (!selectedLead) return;
    setSingleEnrolling(campaignId);
    try {
      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [selectedLead.id],
          action: "enroll_campaign",
          params: { campaignId },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Enrolled in "${campaignName}"`);
      setSingleCampaignMenuOpen(false);
    } catch {
      toast.error("Failed to enroll lead");
    } finally {
      setSingleEnrolling(null);
    }
  }

  /* close bulk-action popovers on outside click */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (listsMenuRef.current && !listsMenuRef.current.contains(target)) {
        setListsMenuOpen(false);
      }
      if (
        campaignMenuRef.current &&
        !campaignMenuRef.current.contains(target)
      ) {
        setCampaignMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false);
      }
      if (tagMenuRef.current && !tagMenuRef.current.contains(target)) {
        setTagMenuOpen(false);
      }
      if (singleCampaignMenuRef.current && !singleCampaignMenuRef.current.contains(target)) {
        setSingleCampaignMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      notifyCreditsUpdated();
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
          notifyCreditsUpdated();
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
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
          return { id, ok: res.ok };
        })
      );
      const deletedIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      const failedCount = results.length - deletedIds.size;

      setLeads((prev) => prev.filter((l) => !deletedIds.has(l.id)));
      if (selectedLead && deletedIds.has(selectedLead.id))
        setSelectedLead(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });

      if (deletedIds.size > 0) {
        toast.success(`Deleted ${deletedIds.size} lead(s)`);
      }
      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} lead(s)`);
      }
    } catch {
      toast.error("Failed to delete some leads");
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Add to list                                                      */
  /* ---------------------------------------------------------------- */

  async function loadAvailableLists() {
    setLoadingLists(true);
    try {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("Failed to load lists");
      const json = await res.json();
      setAvailableLists(json.data ?? []);
    } catch {
      toast.error("Failed to load lists");
    } finally {
      setLoadingLists(false);
    }
  }

  function toggleListsMenu() {
    setListsMenuOpen((prev) => {
      const next = !prev;
      if (next) loadAvailableLists();
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Bulk actions                                                     */
  /* ---------------------------------------------------------------- */

  async function loadAvailableCampaigns() {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to load campaigns");
      const json = await res.json();
      const list = Array.isArray(json.data)
        ? (json.data as Array<{ id: string; name: string }>).map((c) => ({
            id: c.id,
            name: c.name,
          }))
        : [];
      setAvailableCampaigns(list);
    } catch {
      toast.error("Failed to load campaigns");
    } finally {
      setLoadingCampaigns(false);
    }
  }

  function toggleCampaignMenu() {
    setCampaignMenuOpen((prev) => {
      const next = !prev;
      if (next) loadAvailableCampaigns();
      return next;
    });
  }

  async function handleEnrollCampaign(
    campaignId: string,
    campaignName: string
  ) {
    if (selectedIds.size === 0) return;
    setBulkActionLoading("enroll");
    try {
      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: "enroll_campaign",
          params: { campaignId },
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? "Failed to enroll leads");
      }
      const json = await res.json();
      const affected = json.affected ?? 0;
      const skipped = json.skipped ?? 0;
      toast.success(
        `Enrolled ${affected} lead${affected === 1 ? "" : "s"} in "${campaignName}"` +
          (skipped > 0 ? ` (${skipped} skipped)` : "")
      );
      setCampaignMenuOpen(false);
      setSelectedIds(new Set());
      await loadLeads();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to enroll leads"
      );
    } finally {
      setBulkActionLoading(null);
    }
  }

  async function handleBulkSetStatus(status: string) {
    if (selectedIds.size === 0) return;
    setBulkActionLoading("status");
    try {
      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: "set_status",
          params: { status },
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? "Failed to update status");
      }
      const json = await res.json();
      const affected = json.affected ?? 0;
      const skipped = json.skipped ?? 0;
      toast.success(
        `Updated ${affected} lead${affected === 1 ? "" : "s"} to "${formatStatus(
          status
        )}"` + (skipped > 0 ? ` (${skipped} skipped)` : "")
      );
      setStatusMenuOpen(false);
      await loadLeads();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setBulkActionLoading(null);
    }
  }

  async function handleBulkAddTag() {
    if (selectedIds.size === 0) return;
    const tag = tagInput.trim();
    if (!tag) {
      toast.error("Please enter a tag");
      return;
    }
    setBulkActionLoading("tag");
    try {
      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: "add_tag",
          params: { tag },
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error ?? "Failed to add tag");
      }
      const json = await res.json();
      const affected = json.affected ?? 0;
      const skipped = json.skipped ?? 0;
      toast.success(
        `Tagged ${affected} lead${affected === 1 ? "" : "s"} with "${tag}"` +
          (skipped > 0 ? ` (${skipped} skipped)` : "")
      );
      setTagInput("");
      setTagMenuOpen(false);
      await loadLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setBulkActionLoading(null);
    }
  }

  function escapeCsv(value: string) {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function handleExportCsv() {
    if (selectedIds.size === 0) return;
    const rows = leads.filter((l) => selectedIds.has(l.id));
    if (rows.length === 0) {
      toast.error("No selected leads found in the current view");
      return;
    }
    const header = [
      "firstName",
      "lastName",
      "email",
      "companyName",
      "jobTitle",
      "status",
      "tags",
      "createdAt",
    ];
    const lines = [header.join(",")];
    for (const l of rows) {
      const tagStr = Array.isArray(l.tags) ? l.tags.join("|") : "";
      lines.push(
        [
          l.firstName ?? "",
          l.lastName ?? "",
          l.email ?? "",
          l.companyName ?? "",
          l.jobTitle ?? "",
          l.status ?? "",
          tagStr,
          l.createdAt ?? "",
        ]
          .map((v) => escapeCsv(String(v)))
          .join(",")
      );
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `leads-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${rows.length} lead${rows.length === 1 ? "" : "s"} to CSV`
    );
  }

  async function handleAddToList(listId: string, listName: string) {
    if (selectedIds.size === 0) return;
    setAddingToList(listId);
    try {
      const res = await fetch(`/api/lists/${listId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to add leads to list");
      const json = await res.json();
      const added = json.data?.added ?? selectedIds.size;
      toast.success(`Added ${added} lead${added === 1 ? "" : "s"} to "${listName}"`);
      setListsMenuOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add leads to list"
      );
    } finally {
      setAddingToList(null);
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
                      const q = aryaQuery.trim();
                      router.push(`/find-leads${q ? `?q=${encodeURIComponent(q)}` : ""}`);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const q = aryaQuery.trim();
                  router.push(`/find-leads${q ? `?q=${encodeURIComponent(q)}` : ""}`);
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
          <div className="relative" ref={listsMenuRef}>
            <button
              onClick={toggleListsMenu}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-[#6C47FF] hover:bg-violet-100 transition-colors"
            >
              <ListPlus className="h-4 w-4" />
              Add to List
            </button>
            {listsMenuOpen && (
              <div className="absolute left-0 top-10 z-20 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
                {loadingLists ? (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    Loading...
                  </div>
                ) : availableLists.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    No lists yet. Create one from the Lists page.
                  </div>
                ) : (
                  availableLists.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleAddToList(l.id, l.name)}
                      disabled={addingToList === l.id}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <span className="truncate">{l.name}</span>
                      {addingToList === l.id && (
                        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="relative" ref={campaignMenuRef}>
            <button
              onClick={toggleCampaignMenu}
              disabled={bulkActionLoading === "enroll"}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-[#6C47FF] hover:bg-violet-100 transition-colors disabled:opacity-50"
            >
              {bulkActionLoading === "enroll" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              Enroll in Campaign
            </button>
            {campaignMenuOpen && (
              <div className="absolute left-0 top-10 z-20 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
                {loadingCampaigns ? (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    Loading...
                  </div>
                ) : availableCampaigns.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    No campaigns yet. Create one from the Campaigns page.
                  </div>
                ) : (
                  availableCampaigns.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleEnrollCampaign(c.id, c.name)}
                      disabled={bulkActionLoading === "enroll"}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setStatusMenuOpen((v) => !v)}
              disabled={bulkActionLoading === "status"}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
            >
              {bulkActionLoading === "status" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
              Set Status
            </button>
            {statusMenuOpen && (
              <div className="absolute left-0 top-10 z-20 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {BULK_STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBulkSetStatus(s)}
                    disabled={bulkActionLoading === "status"}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm capitalize text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {formatStatus(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="relative" ref={tagMenuRef}>
            <button
              onClick={() => setTagMenuOpen((v) => !v)}
              disabled={bulkActionLoading === "tag"}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
            >
              {bulkActionLoading === "tag" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Tag className="h-4 w-4" />
              )}
              Add Tag
            </button>
            {tagMenuOpen && (
              <div className="absolute left-0 top-10 z-20 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                <input
                  autoFocus
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBulkAddTag();
                    }
                  }}
                  placeholder="Tag name..."
                  className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF]"
                />
                <button
                  onClick={handleBulkAddTag}
                  disabled={bulkActionLoading === "tag" || !tagInput.trim()}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-[#6C47FF] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
                >
                  {bulkActionLoading === "tag" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Tag className="h-3.5 w-3.5" />
                  )}
                  Apply Tag
                </button>
              </div>
            )}
          </div>
        )}

        {selectedIds.size > 0 && (
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}

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
      {error ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : !loading && leads.length === 0 ? (
        <LeadsEmptyState
          onImport={() => fileInputRef.current?.click()}
          onAdd={() => setShowForm(true)}
        />
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
                    disabled={loading}
                    className="h-4 w-4 rounded border-border text-[#6C47FF] focus:ring-[#6C47FF] cursor-pointer accent-[#6C47FF] disabled:cursor-not-allowed"
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
              {loading ? (
                <LeadsTableSkeleton rows={8} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-16 text-sm text-muted-foreground"
                  >
                    No leads match your filters.
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter(null);
                        setStatusDropdown("All");
                      }}
                      className="ml-1.5 text-[#6C47FF] font-medium underline-offset-2 hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginated.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => { setSelectedLead(lead); loadLeadDetail(lead.id); }}
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
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedLead(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-border shadow-xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-foreground">Lead Details</h2>
              <button onClick={() => setSelectedLead(null)} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors inline-flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile */}
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center text-[#6C47FF] font-bold text-lg shrink-0">
                  {getLeadName(selectedLead).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-foreground truncate">{getLeadName(selectedLead)}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLead.jobTitle ?? "No title"}</p>
                  {selectedLead.companyName && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {selectedLead.companyName}
                    </div>
                  )}
                  {selectedLead.score != null && (
                    <div className="mt-1.5">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", getScoreColor(selectedLead.score))}>
                        Score: {selectedLead.score}/100
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2.5">
                {selectedLead.email && (
                  <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-3 text-sm hover:text-violet-600 transition-colors group">
                    <Mail className="h-4 w-4 text-gray-400 group-hover:text-violet-500 shrink-0" />
                    <span className="truncate">{selectedLead.email}</span>
                  </a>
                )}
                {loadingDetail ? (
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Loading contact info…
                  </div>
                ) : (
                  <>
                    {leadDetail?.phone ? (
                      <a href={`tel:${leadDetail.phone}`} className="flex items-center gap-3 text-sm hover:text-violet-600 transition-colors group">
                        <Phone className="h-4 w-4 text-gray-400 group-hover:text-violet-500 shrink-0" />
                        {leadDetail.phone}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Phone className="h-4 w-4 shrink-0" />
                        Phone not available
                      </div>
                    )}
                    {leadDetail?.linkedinUrl ? (
                      <a href={leadDetail.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-violet-600 hover:underline group">
                        <Linkedin className="h-4 w-4 shrink-0" />
                        View LinkedIn profile
                        <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Linkedin className="h-4 w-4 shrink-0" />
                        LinkedIn not available
                      </div>
                    )}
                    {leadDetail?.companyWebsite && (
                      <a href={`https://${leadDetail.companyWebsite.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-violet-600 hover:underline group">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        {leadDetail.companyWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    )}
                  </>
                )}
              </div>

              {/* Tags */}
              {!loadingDetail && leadDetail && leadDetail.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {leadDetail.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Enrich */}
              <div className="space-y-2">
                <button
                  onClick={() => handleEnrich(selectedLead.id)}
                  disabled={enriching}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#6C47FF] px-4 py-2.5 text-sm font-medium text-[#6C47FF] hover:bg-violet-50 transition-colors w-full disabled:opacity-50"
                >
                  {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {enriching ? "Enriching…" : "Enrich with AI"}
                </button>
                {enrichmentStatus && !enrichmentStatus.providerConfigured && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Enrichment provider not configured</p>
                      <p className="mt-0.5">Set <code className="font-mono">ENRICHMENT_PROVIDER</code> env var.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Research summary / icebreakers */}
              {!loadingDetail && leadDetail?.researchSummary && (
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <p className="text-xs font-semibold text-violet-700 mb-1.5">AI Research Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{leadDetail.researchSummary}</p>
                </div>
              )}
              {!loadingDetail && leadDetail && leadDetail.icebreakers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Icebreakers</p>
                  <div className="space-y-1.5">
                    {leadDetail.icebreakers.slice(0, 3).map((ib, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                        {ib}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Activity Timeline</h4>
                {loadingDetail ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
                  </div>
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.slice(0, 8).map((event, i) => {
                      const when = new Date(event.when).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                      if (event.type === "lead_created") return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                            <UserPlus className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Lead created</p>
                            <p className="text-xs text-gray-400">{when}</p>
                          </div>
                        </div>
                      );
                      if (event.type === "outreach_sent") return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Send className="h-3.5 w-3.5 text-violet-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {event.subject ?? `${event.channel} sent`}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-gray-400">{when}</p>
                              {event.opens > 0 && <span className="text-xs text-emerald-600">{event.opens} open{event.opens > 1 ? "s" : ""}</span>}
                              {event.replies > 0 && <span className="text-xs text-violet-600">{event.replies} repl{event.replies > 1 ? "ies" : "y"}</span>}
                            </div>
                          </div>
                        </div>
                      );
                      if (event.type === "reply_received") return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageCircle className="h-3.5 w-3.5 text-violet-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              Reply received {event.sentiment ? `· ${event.sentiment}` : ""}
                            </p>
                            <p className="text-xs text-gray-400">{when}</p>
                            {event.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.body}</p>}
                          </div>
                        </div>
                      );
                      if (event.type === "task") return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{event.taskType ?? "Task"} · {event.status ?? "pending"}</p>
                            <p className="text-xs text-gray-400">{when}</p>
                          </div>
                        </div>
                      );
                      return null;
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">Notes</h4>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    {savingNotes ? "Saving…" : "Save"}
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead…"
                  rows={4}
                  className="w-full rounded-lg border border-border bg-[#FAFAFA] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {selectedLead.email && (
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors w-full"
                  >
                    <Send className="h-4 w-4" />
                    Send Email
                  </a>
                )}

                {/* Add to Campaign dropdown */}
                <div className="relative" ref={singleCampaignMenuRef}>
                  <button
                    onClick={() => {
                      setSingleCampaignMenuOpen((v) => !v);
                      if (availableCampaigns.length === 0) loadAvailableCampaigns();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#6C47FF] px-4 py-2.5 text-sm font-medium text-[#6C47FF] hover:bg-violet-50 transition-colors w-full"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add to Campaign
                  </button>
                  {singleCampaignMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-20 max-h-48 overflow-y-auto">
                      {loadingCampaigns ? (
                        <div className="px-3 py-2 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>
                      ) : availableCampaigns.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400">No campaigns yet.</div>
                      ) : (
                        availableCampaigns.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleEnrollSingleCampaign(c.id, c.name)}
                            disabled={singleEnrolling === c.id}
                            className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span className="truncate">{c.name}</span>
                            {singleEnrolling === c.id && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { handleDelete(selectedLead.id); }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Lead
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton + Empty State                                             */
/* ------------------------------------------------------------------ */

function LeadsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border/60">
          <td className="px-4 py-4">
            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          </td>
          <td className="px-4 py-4 hidden lg:table-cell">
            <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 w-10 rounded-full bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-4 hidden md:table-cell">
            <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
          </td>
          <td className="px-4 py-4">
            <div className="flex justify-end">
              <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function LeadsEmptyState({
  onImport,
  onAdd,
}: {
  onImport: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white px-6 py-16 text-center">
      <div className="mx-auto mb-6 h-40 w-40">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden>
          <defs>
            <linearGradient id="leadsGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EDE9FE" />
              <stop offset="100%" stopColor="#F5F3FF" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="80" fill="url(#leadsGrad)" />
          <rect x="52" y="70" width="96" height="70" rx="10" fill="#FFFFFF" stroke="#DDD6FE" strokeWidth="1.5" />
          <rect x="62" y="82" width="76" height="6" rx="3" fill="#EDE9FE" />
          <rect x="62" y="94" width="52" height="4" rx="2" fill="#F5F3FF" />
          <rect x="62" y="104" width="60" height="4" rx="2" fill="#F5F3FF" />
          <circle cx="140" cy="118" r="14" fill="#6C47FF" />
          <path d="M134 118l4 4 8-8" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="58" r="5" fill="#C4B5FD" opacity="0.7" />
          <circle cx="150" cy="52" r="3.5" fill="#DDD6FE" opacity="0.8" />
          <circle cx="42" cy="146" r="4" fill="#C4B5FD" opacity="0.6" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">No leads yet</h3>
      <p className="mt-1.5 text-sm text-gray-500 max-w-sm mx-auto">
        Import your first leads from a CSV or add one manually to start building your pipeline.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          onClick={onImport}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5835E8] active:scale-[0.98] transition-all duration-150"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="h-4 w-4" />
          Add lead manually
        </button>
      </div>
    </div>
  );
}
