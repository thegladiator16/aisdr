"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  UserPlus,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { cn, STATUS_COLOR } from "@/lib/utils";

type MemberLead = {
  id: string;
  fullName: string | null;
  email: string | null;
  companyName: string | null;
  jobTitle: string | null;
  location: string | null;
  status: string | null;
};

type ListDetail = {
  id: string;
  name: string;
  description: string | null;
  leadCount: number;
  createdAt: string | null;
  leads: MemberLead[];
};

const PAGE_SIZE = 25;
const SORT_OPTIONS = ["Name A–Z", "Name Z–A", "Company A–Z", "Status"];

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

function getDisplayName(lead: MemberLead) {
  return lead.fullName ?? "Unknown";
}

function getInitials(lead: MemberLead) {
  const name = getDisplayName(lead);
  if (name === "Unknown") return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-violet-200 text-violet-800",
  "bg-violet-50 text-violet-600",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-purple-100 text-purple-700",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* --- local UI state --- */
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${params.id}`);
      if (!res.ok) throw new Error(res.status === 404 ? "List not found" : "Failed to load list");
      const json = await res.json();
      setList(json.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load list";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { loadList(); }, [loadList]);

  /* ---- filtering + sorting ---- */
  const filtered = useMemo(() => {
    if (!list) return [];
    const q = search.toLowerCase();
    let rows = list.leads;
    if (q) rows = rows.filter((l) =>
      (getDisplayName(l) + " " + (l.email ?? "") + " " + (l.companyName ?? "") + " " + (l.jobTitle ?? "")).toLowerCase().includes(q)
    );
    rows = [...rows].sort((a, b) => {
      if (sortBy === "Name A–Z") return getDisplayName(a).localeCompare(getDisplayName(b));
      if (sortBy === "Name Z–A") return getDisplayName(b).localeCompare(getDisplayName(a));
      if (sortBy === "Company A–Z") return (a.companyName ?? "").localeCompare(b.companyName ?? "");
      if (sortBy === "Status") return (a.status ?? "").localeCompare(b.status ?? "");
      return 0;
    });
    return rows;
  }, [list, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allOnPageSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (allOnPageSelected) paginated.forEach((l) => n.delete(l.id));
      else paginated.forEach((l) => n.add(l.id));
      return n;
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleRemove(leadId: string) {
    setRemovingIds((prev) => new Set(prev).add(leadId));
    try {
      const res = await fetch(`/api/lists/${params.id}/leads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error("Failed to remove lead");
      setList((prev) => prev ? { ...prev, leads: prev.leads.filter((l) => l.id !== leadId), leadCount: Math.max(0, prev.leadCount - 1) } : prev);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(leadId); return n; });
      toast.success("Lead removed from list");
    } catch {
      toast.error("Failed to remove lead");
    } finally {
      setRemovingIds((prev) => { const n = new Set(prev); n.delete(leadId); return n; });
    }
  }

  async function handleBulkRemove() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkRemoving(true);
    try {
      await Promise.all(ids.map((id) =>
        fetch(`/api/lists/${params.id}/leads`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: id }),
        })
      ));
      setList((prev) => prev ? { ...prev, leads: prev.leads.filter((l) => !selectedIds.has(l.id)), leadCount: Math.max(0, prev.leadCount - ids.length) } : prev);
      setSelectedIds(new Set());
      toast.success(`Removed ${ids.length} lead${ids.length > 1 ? "s" : ""} from list`);
    } catch {
      toast.error("Failed to remove some leads");
    } finally {
      setBulkRemoving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner /></div>;

  if (error || !list) return (
    <div className="space-y-4">
      <button onClick={() => router.push("/lists")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to lists
      </button>
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">{error ?? "List not found"}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/lists")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to lists
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
            {list.description && <p className="text-sm text-gray-500 mt-1">{list.description}</p>}
            <p className="text-sm text-gray-400 mt-0.5">{list.leadCount} lead{list.leadCount === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/find-leads/results`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserPlus className="h-4 w-4" /> Add leads
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <Send className="h-4 w-4" /> Create campaign
            </Link>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search leads…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-violet-500 transition"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sort: <span className="font-medium">{sortBy}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-20">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSortBy(opt); setSortOpen(false); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {opt}
                  {sortBy === opt && <Check className="h-4 w-4 text-violet-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkRemove}
            disabled={bulkRemoving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {bulkRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove {selectedIds.size} selected
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 accent-violet-600 cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                  {search ? "No leads match your search." : "No leads in this list yet."}
                </td>
              </tr>
            ) : (
              paginated.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const isRemoving = removingIds.has(lead.id);
                return (
                  <tr key={lead.id} className={cn("transition-colors hover:bg-violet-50/30", isSelected && "bg-violet-50/50")}>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(lead.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-violet-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold", avatarColor(lead.id))}>
                          {getInitials(lead)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{getDisplayName(lead)}</p>
                          {lead.jobTitle && <p className="text-xs text-gray-500 mt-0.5">{lead.jobTitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{lead.companyName ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{lead.email ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_COLOR[lead.status ?? "new"] ?? "text-zinc-500 bg-zinc-100")}>
                        {formatStatus(lead.status ?? "new")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(lead.id)}
                        disabled={isRemoving}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Remove from list"
                      >
                        {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors inline-flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn("h-8 w-8 rounded-lg text-sm font-medium transition-colors", p === safePage ? "bg-violet-600 text-white" : "text-gray-500 hover:bg-gray-50")}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors inline-flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <p className="text-xs text-gray-400 text-center">
        {filtered.length} of {list.leadCount} leads shown
        {search && ` · filtered by "${search}"`}
      </p>
    </div>
  );
}
