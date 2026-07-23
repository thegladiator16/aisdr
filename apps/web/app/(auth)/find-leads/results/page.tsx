"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  UserPlus,
  ListPlus,
  Plus,
  X,
  SlidersHorizontal,
  Briefcase,
  MapPin,
  Building2,
  Globe,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  location: string | null;
  industry: string | null;
  email: string | null;
  seniority: string | null;
  department: string | null;
  linkedinUrl: string | null;
  status: string | null;
}

type FilterSection = "role" | "location" | "company" | "headcount";

const SENIORITY_OPTIONS = ["C-Suite", "VP", "Director", "Manager", "Individual Contributor", "Entry Level"];
const DEPARTMENT_OPTIONS = ["Sales", "Marketing", "Engineering", "Operations", "Finance", "HR", "Product", "Legal"];
const INDUSTRY_OPTIONS = ["SaaS", "FinTech", "Manufacturing", "Healthcare", "Retail", "Education", "Real Estate"];

export default function FindLeadsResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");

  /* add-to-list */
  const [listsMenuOpen, setListsMenuOpen] = useState(false);
  const [availableLists, setAvailableLists] = useState<{ id: string; name: string }[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showNewListInput, setShowNewListInput] = useState(false);
  const listsMenuRef = useRef<HTMLDivElement | null>(null);

  /* campaign modal */
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState<{ id: string; name: string }[]>([]);
  const campaignMenuRef = useRef<HTMLDivElement | null>(null);

  /* filter state */
  const [searchMode, setSearchMode] = useState<"people" | "companies">("people");
  const [openSections, setOpenSections] = useState<Set<FilterSection>>(new Set(["role"]));
  const [titlesToInclude, setTitlesToInclude] = useState<string[]>([]);
  const [titleInput, setTitleInput] = useState("");
  const [seniorities, setSeniorities] = useState<Set<string>>(new Set());
  const [departments, setDepartments] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [headcountMin, setHeadcountMin] = useState("");
  const [headcountMax, setHeadcountMax] = useState("");

  /* AI describe */
  const [aiSearch, setAiSearch] = useState(searchParams.get("q") ?? "");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setLeads(json.data ?? []);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (listsMenuRef.current && !listsMenuRef.current.contains(e.target as Node)) setListsMenuOpen(false);
      if (campaignMenuRef.current && !campaignMenuRef.current.contains(e.target as Node)) setCampaignMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function loadAvailableLists() {
    setLoadingLists(true);
    try {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAvailableLists(json.data ?? []);
    } catch { toast.error("Failed to load lists"); }
    finally { setLoadingLists(false); }
  }

  async function loadAvailableCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAvailableCampaigns(json.data ?? []);
    } catch { /* silent */ }
  }

  function toggleListsMenu() {
    setListsMenuOpen((prev) => { const next = !prev; if (next) loadAvailableLists(); return next; });
  }

  function toggleCampaignMenu() {
    setCampaignMenuOpen((prev) => { const next = !prev; if (next) loadAvailableCampaigns(); return next; });
  }

  async function handleAddToList(listId: string, listName: string) {
    if (selectedLeads.size === 0) return;
    setAddingToList(listId);
    try {
      const res = await fetch(`/api/lists/${listId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Added ${selectedLeads.size} lead${selectedLeads.size > 1 ? "s" : ""} to "${listName}"`);
      setListsMenuOpen(false);
      setSelectedLeads(new Set());
    } catch { toast.error("Failed to add leads to list"); }
    finally { setAddingToList(null); }
  }

  async function handleCreateList() {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.data?.id && selectedLeads.size > 0) {
        await handleAddToList(json.data.id, newListName.trim());
      }
      toast.success(`List "${newListName.trim()}" created`);
      setNewListName("");
      setShowNewListInput(false);
      loadAvailableLists();
    } catch { toast.error("Failed to create list"); }
    finally { setCreatingList(false); }
  }

  const getDisplayName = (lead: Lead) =>
    lead.fullName ?? ([lead.firstName, lead.lastName].filter(Boolean).join(" ") || "-");

  const getInitials = (lead: Lead) => {
    const name = getDisplayName(lead);
    if (name === "-") return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const AVATAR_COLORS = [
    "bg-violet-100 text-violet-700",
    "bg-violet-200 text-violet-800",
    "bg-violet-50 text-violet-600",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-purple-100 text-purple-700",
    "bg-violet-100 text-violet-600",
  ];

  const getAvatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

  function addTitle() {
    const t = titleInput.trim();
    if (t && !titlesToInclude.includes(t)) setTitlesToInclude((prev) => [...prev, t]);
    setTitleInput("");
  }

  function removeTitle(t: string) {
    setTitlesToInclude((prev) => prev.filter((x) => x !== t));
  }

  function toggleSection(s: FilterSection) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  const filteredLeads = leads.filter((lead) => {
    const q = (aiSearch || searchQuery).toLowerCase();
    if (q) {
      const hay = `${getDisplayName(lead)} ${lead.jobTitle ?? ""} ${lead.companyName ?? ""} ${lead.email ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (titlesToInclude.length > 0) {
      const lt = (lead.jobTitle ?? "").toLowerCase();
      if (!titlesToInclude.some((t) => lt.includes(t.toLowerCase()))) return false;
    }
    if (seniorities.size > 0 && lead.seniority && !seniorities.has(lead.seniority)) return false;
    if (departments.size > 0 && lead.department && !departments.has(lead.department)) return false;
    if (locationFilter && !(lead.location ?? "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (industryFilter && !(lead.industry ?? "").toLowerCase().includes(industryFilter.toLowerCase())) return false;
    if (companyFilter && !(lead.companyName ?? "").toLowerCase().includes(companyFilter.toLowerCase())) return false;
    return true;
  });

  const toggleLead = (id: string) => {
    setSelectedLeads((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    setSelectedLeads(selectedLeads.size === filteredLeads.length ? new Set() : new Set(filteredLeads.map((l) => l.id)));
  };

  const clearAllFilters = () => {
    setTitlesToInclude([]);
    setSeniorities(new Set());
    setDepartments(new Set());
    setSearchQuery("");
    setAiSearch("");
    setLocationFilter("");
    setIndustryFilter("");
    setCompanyFilter("");
    setHeadcountMin("");
    setHeadcountMax("");
  };

  const hasFilters = titlesToInclude.length > 0 || seniorities.size > 0 || departments.size > 0 || locationFilter || industryFilter || companyFilter || headcountMin || headcountMax;

  /* Companies view: dedupe leads by companyName */
  type CompanyRow = { name: string; website: string | null; location: string | null; industry: string | null; leadCount: number };
  const filteredCompanies: CompanyRow[] = (() => {
    if (searchMode !== "companies") return [];
    const byName = new Map<string, CompanyRow>();
    for (const lead of filteredLeads) {
      const name = (lead.companyName ?? "").trim();
      if (!name) continue;
      const existing = byName.get(name);
      if (existing) {
        existing.leadCount += 1;
      } else {
        byName.set(name, {
          name,
          website: lead.companyWebsite ?? null,
          location: lead.location ?? null,
          industry: lead.industry ?? null,
          leadCount: 1,
        });
      }
    }
    return Array.from(byName.values()).sort((a, b) => b.leadCount - a.leadCount);
  })();

  /* Filter icon: toggle all sections open/closed */
  const relevantSections: FilterSection[] =
    searchMode === "companies"
      ? ["company", "headcount"]
      : ["role", "location", "company", "headcount"];
  const allSectionsOpen = relevantSections.every((s) => openSections.has(s));
  const toggleAllSections = () => {
    setOpenSections(allSectionsOpen ? new Set() : new Set(relevantSections));
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* ── Left filter panel ── */}
      <aside className="w-80 shrink-0 border-r border-gray-200 overflow-x-hidden overflow-y-auto bg-white flex flex-col">
        {/* Breadcrumb + People/Companies toggle */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
            <Link href="/find-leads" className="hover:text-violet-600 transition">Find leads</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-900 font-medium">Create a list</span>
          </div>
          {/* AI describe bar */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleAllSections}
              aria-label={allSectionsOpen ? "Collapse all filters" : "Expand all filters"}
              aria-pressed={allSectionsOpen}
              title={allSectionsOpen ? "Collapse all filters" : "Expand all filters"}
              className={cn(
                "absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors active:scale-95",
                allSectionsOpen
                  ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                  : "text-violet-500 hover:bg-violet-100 hover:text-violet-700"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={aiSearch}
              onChange={(e) => setAiSearch(e.target.value)}
              placeholder="Describe who you want to find..."
              className="w-full rounded-lg border border-violet-200 bg-violet-50/50 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:bg-white transition placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Search for selector */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Search for</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setSearchMode("people")}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  searchMode === "people"
                    ? "bg-violet-50 text-violet-700"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                People
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("companies")}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors border-l border-gray-200",
                  searchMode === "companies"
                    ? "bg-violet-50 text-violet-700"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                Companies
              </button>
            </div>
          </div>

          {/* Role & seniority — person-specific, hidden in Companies mode */}
          {searchMode === "people" && (
          <FilterSection
            label="Role & seniority"
            icon={Briefcase}
            open={openSections.has("role")}
            onToggle={() => toggleSection("role")}
            active={titlesToInclude.length > 0 || seniorities.size > 0}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Job titles to include</label>
                {titlesToInclude.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {titlesToInclude.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        {t}
                        <button onClick={() => removeTitle(t)} className="ml-0.5 hover:text-violet-900">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTitle(); } }}
                    placeholder="Search job titles..."
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
                  />
                  <button onClick={addTitle} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition">
                    <Plus className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Management level</label>
                <div className="flex flex-wrap gap-1.5">
                  {SENIORITY_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeniorities((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                        seniorities.has(s) ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Department</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepartments((prev) => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                        departments.has(d) ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </FilterSection>
          )}

          {/* Person location — person-specific, hidden in Companies mode */}
          {searchMode === "people" && (
          <FilterSection
            label="Person location"
            icon={MapPin}
            open={openSections.has("location")}
            onToggle={() => toggleSection("location")}
            active={!!locationFilter}
          >
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="e.g. United States, Bangalore..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
            />
          </FilterSection>
          )}

          {/* Company attributes */}
          <FilterSection
            label="Company attributes"
            icon={Building2}
            open={openSections.has("company")}
            onToggle={() => toggleSection("company")}
            active={!!companyFilter || !!industryFilter}
          >
            <div className="space-y-2.5">
              <input
                type="text"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                placeholder="Company name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
              />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Industry</label>
                <div className="flex flex-wrap gap-1.5">
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <button
                      key={ind}
                      onClick={() => setIndustryFilter(industryFilter === ind ? "" : ind)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                        industryFilter === ind ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </FilterSection>

          {/* Company headcount */}
          <FilterSection
            label="Company headcount"
            icon={Globe}
            open={openSections.has("headcount")}
            onToggle={() => toggleSection("headcount")}
            active={!!headcountMin || !!headcountMax}
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={headcountMin}
                onChange={(e) => setHeadcountMin(e.target.value)}
                placeholder="Min"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
              />
              <span className="text-gray-400 text-sm shrink-0">–</span>
              <input
                type="number"
                value={headcountMax}
                onChange={(e) => setHeadcountMax(e.target.value)}
                placeholder="Max"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 transition"
              />
            </div>
          </FilterSection>
        </div>

        {hasFilters && (
          <div className="p-4 border-t border-gray-100">
            <button onClick={clearAllFilters} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition">
              <X className="h-3.5 w-3.5" /> Clear all filters
            </button>
          </div>
        )}
      </aside>

      {/* ── Main results area ── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top search bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchMode === "companies" ? "Search companies..." : "Search people..."}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-violet-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-3">
            <p className="text-sm text-gray-500">
              {searchMode === "companies" ? (
                <>Showing <span className="font-semibold text-gray-900">{filteredCompanies.length}</span> companies from <span className="font-semibold text-gray-900">{filteredLeads.length}</span> leads</>
              ) : (
                <>Showing <span className="font-semibold text-gray-900">{filteredLeads.length}</span> of{" "}
                <span className="font-semibold text-gray-900">{leads.length}</span> people</>
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No leads yet</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Import leads from CSV, add them manually, or use the AI lead finder to get started.
              </p>
              <Link
                href="/leads"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
              >
                <UserPlus className="h-4 w-4" /> Add leads
              </Link>
            </div>
          ) : searchMode === "companies" ? (
            filteredCompanies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No companies match your filters</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Try widening your filters or clearing the search to see all companies.
                </p>
              </div>
            ) : (
            <div className="bg-white border-t border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {[
                      { label: "Company" },
                      { label: "Industry" },
                      { label: "Location" },
                      { label: "Website" },
                      { label: "Leads" },
                    ].map((col) => (
                      <th key={col.label} className="py-3 px-4 text-left">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {col.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((c) => {
                    const initials = c.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
                    return (
                      <tr key={c.name} className="border-b border-gray-50 transition-colors hover:bg-violet-50/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 text-xs font-semibold">
                              {initials || <Building2 className="h-4 w-4" />}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{c.industry ?? "-"}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{c.location ?? "-"}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {c.website ? (
                            <a
                              href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-600 hover:text-violet-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            </a>
                          ) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-xs font-semibold ring-1 ring-violet-200">
                            {c.leadCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )
          ) : (
            <div className="bg-white border-t border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 accent-violet-600 cursor-pointer"
                      />
                    </th>
                    {[
                      { label: "Name", icon: null },
                      { label: "Company", icon: null },
                      { label: "Person's Location", icon: null },
                      { label: "Industry", icon: null },
                      { label: "Website", icon: null },
                    ].map((col) => (
                      <th key={col.label} className="py-3 px-4 text-left">
                        <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 transition">
                          {col.label}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const name = getDisplayName(lead);
                    const initials = getInitials(lead);
                    const avatarColor = getAvatarColor(lead.id);
                    const isSelected = selectedLeads.has(lead.id);

                    return (
                      <tr
                        key={lead.id}
                        className={cn(
                          "border-b border-gray-50 transition-colors hover:bg-violet-50/30 cursor-pointer",
                          isSelected && "bg-violet-50/50"
                        )}
                        onClick={() => toggleLead(lead.id)}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLead(lead.id)}
                            className="h-4 w-4 rounded border-gray-300 accent-violet-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold", avatarColor)}>
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 leading-tight">{name}</p>
                              {lead.jobTitle && <p className="text-xs text-gray-500 mt-0.5 leading-tight">{lead.jobTitle}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {lead.companyName ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                <Building2 className="h-3 w-3 text-gray-400" />
                              </div>
                              <span className="text-sm text-gray-700">{lead.companyName}</span>
                            </div>
                          ) : <span className="text-sm text-gray-400">-</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{lead.location ?? "-"}</td>
                        <td className="py-3 px-4">
                          {lead.industry ? (
                            <span className="text-sm text-gray-600">{lead.industry}</span>
                          ) : <span className="text-sm text-gray-400">-</span>}
                        </td>
                        <td className="py-3 px-4">
                          {lead.companyWebsite ? (
                            <a
                              href={`https://${lead.companyWebsite.replace(/^https?:\/\//, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-violet-600 hover:underline"
                            >
                              {lead.companyWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            </a>
                          ) : <span className="text-sm text-gray-400">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Bottom action bar ── */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-700">
            {selectedLeads.size > 0 ? (
              <span className="text-violet-700">{selectedLeads.size.toLocaleString()} people selected</span>
            ) : (
              <span className="text-gray-500">{filteredLeads.length.toLocaleString()} People</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {/* Add to list */}
            <div className="relative" ref={listsMenuRef}>
              <button
                onClick={toggleListsMenu}
                disabled={selectedLeads.size === 0}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ListPlus className="h-4 w-4" />
                Add to list
              </button>
              {listsMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-20">
                  {loadingLists ? (
                    <div className="px-3 py-2 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading...</div>
                  ) : (
                    <>
                      {availableLists.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => handleAddToList(l.id, l.name)}
                          disabled={addingToList === l.id}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <span className="truncate">{l.name}</span>
                          {addingToList === l.id && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                        </button>
                      ))}
                      {availableLists.length > 0 && <div className="my-1 border-t border-gray-100" />}
                      {showNewListInput ? (
                        <div className="px-3 py-2 flex gap-1.5">
                          <input
                            autoFocus
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCreateList(); if (e.key === "Escape") setShowNewListInput(false); }}
                            placeholder="List name..."
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-violet-500 transition"
                          />
                          <button onClick={handleCreateList} disabled={creatingList} className="rounded-lg bg-violet-600 px-2 py-1.5 text-xs text-white hover:bg-violet-700 transition disabled:opacity-60">
                            {creatingList ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setShowNewListInput(true)} className="flex w-full items-center gap-1.5 px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 transition font-medium">
                          <Plus className="h-3.5 w-3.5" /> New list
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Create new list */}
            <button
              onClick={() => { setShowNewListInput(true); setListsMenuOpen(true); loadAvailableLists(); }}
              disabled={selectedLeads.size === 0}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Create new list
            </button>

            {/* Create new campaign */}
            <div className="relative" ref={campaignMenuRef}>
              <button
                onClick={toggleCampaignMenu}
                disabled={selectedLeads.size === 0}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Rocket className="h-4 w-4" />
                Create new campaign
              </button>
              {campaignMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-20">
                  {availableCampaigns.length === 0 ? (
                    <Link href="/campaigns" className="flex items-center gap-2 px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 transition font-medium">
                      <Plus className="h-3.5 w-3.5" /> Create campaign
                    </Link>
                  ) : (
                    availableCampaigns.map((camp) => (
                      <Link
                        key={camp.id}
                        href={`/campaigns/${camp.id}`}
                        className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        {camp.name}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── FilterSection sub-component ── */
function FilterSection({
  label,
  icon: Icon,
  open,
  onToggle,
  active,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          {active && <span className="h-1.5 w-1.5 rounded-full bg-violet-600 shrink-0" />}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
