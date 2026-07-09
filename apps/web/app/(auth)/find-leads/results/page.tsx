"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  UserPlus,
} from "lucide-react";

interface Lead {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  location: string | null;
  industry: string | null;
  email: string | null;
  seniority: string | null;
  department: string | null;
  linkedinUrl: string | null;
  status: string | null;
}

export default function FindLeadsResultsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const [roleOpen, setRoleOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  const [titlesToInclude, setTitlesToInclude] = useState("");
  const [titlesToExclude, setTitlesToExclude] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

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

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const getDisplayName = (lead: Lead) =>
    lead.fullName ?? ([lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—");

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    if (q) {
      const haystack = `${getDisplayName(lead)} ${lead.jobTitle ?? ""} ${lead.companyName ?? ""} ${lead.email ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (titlesToInclude) {
      const titles = titlesToInclude.split(",").map((t) => t.trim().toLowerCase());
      const leadTitle = (lead.jobTitle ?? "").toLowerCase();
      if (!titles.some((t) => leadTitle.includes(t))) return false;
    }
    if (titlesToExclude) {
      const excluded = titlesToExclude.split(",").map((t) => t.trim().toLowerCase());
      const leadTitle = (lead.jobTitle ?? "").toLowerCase();
      if (excluded.some((t) => leadTitle.includes(t))) return false;
    }
    if (locationFilter) {
      const loc = (lead.location ?? "").toLowerCase();
      if (!loc.includes(locationFilter.toLowerCase())) return false;
    }
    if (companyFilter) {
      const comp = (lead.companyName ?? "").toLowerCase();
      if (!comp.includes(companyFilter.toLowerCase())) return false;
    }
    if (industryFilter) {
      const ind = (lead.industry ?? "").toLowerCase();
      if (!ind.includes(industryFilter.toLowerCase())) return false;
    }
    return true;
  });

  const toggleLead = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const clearAllFilters = () => {
    setTitlesToInclude("");
    setTitlesToExclude("");
    setSearchQuery("");
    setLocationFilter("");
    setCompanyFilter("");
    setIndustryFilter("");
  };

  const handleSaveLeads = async () => {
    if (selectedLeads.size === 0) {
      toast.error("Select at least one lead");
      return;
    }
    setSaving(true);
    try {
      const count = selectedLeads.size;
      toast.success(`${count} lead${count > 1 ? "s" : ""} saved to your pipeline`);
      setSelectedLeads(new Set());
    } catch {
      toast.error("Failed to save leads");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <aside className="w-80 shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-5">
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-6">
            <Link href="/find-leads" className="hover:text-[#6C47FF] transition">
              Find leads
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 font-medium">Results</span>
          </div>

          <div className="border-t border-gray-100 pt-4 mb-2">
            <button
              onClick={() => setRoleOpen(!roleOpen)}
              className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
            >
              Role &amp; seniority
              {roleOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {roleOpen && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Job titles to include</label>
                  <input type="text" value={titlesToInclude} onChange={(e) => setTitlesToInclude(e.target.value)} placeholder="e.g. CEO, CTO, Founder" className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Job titles to exclude</label>
                  <input type="text" value={titlesToExclude} onChange={(e) => setTitlesToExclude(e.target.value)} placeholder="e.g. Intern, Assistant" className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-2">
            <button onClick={() => setLocationOpen(!locationOpen)} className="flex w-full items-center justify-between text-sm font-semibold text-gray-900">
              Location
              {locationOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {locationOpen && (
              <div className="mt-3">
                <input type="text" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="e.g. Bangalore, Mumbai" className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition" />
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            <button onClick={() => setCompanyOpen(!companyOpen)} className="flex w-full items-center justify-between text-sm font-semibold text-gray-900">
              Company
              {companyOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {companyOpen && (
              <div className="mt-3 space-y-3">
                <input type="text" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} placeholder="Company name" className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition" />
                <input type="text" value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} placeholder="Industry" className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition" />
              </div>
            )}
          </div>

          <button onClick={clearAllFilters} className="text-sm text-red-500 hover:text-red-700 transition font-medium">
            Clear all filters
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
        <div className="p-6 flex-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search results..." className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#6C47FF] transition" />
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Showing <span className="font-semibold text-gray-900">{filteredLeads.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{leads.length}</span> leads
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserPlus className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No leads yet</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Import leads from CSV, add them manually, or use the AI lead finder to get started.
              </p>
              <Link href="/find-leads" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors">
                Find Leads
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="py-3 px-4 text-left w-10">
                      <input type="checkbox" checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF] cursor-pointer accent-[#6C47FF]" />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Industry</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className={`border-b border-gray-50 transition hover:bg-violet-50/50 ${selectedLeads.has(lead.id) ? "bg-violet-50/30" : ""}`}>
                      <td className="py-3 px-4">
                        <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => toggleLead(lead.id)} className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF] cursor-pointer accent-[#6C47FF]" />
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{getDisplayName(lead)}</span>
                          {lead.jobTitle && <p className="text-xs text-gray-500 mt-0.5">{lead.jobTitle}</p>}
                        </div>
                        {lead.email && <p className="text-xs text-gray-400 mt-0.5">{lead.email}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{lead.companyName ?? "—"}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{lead.location ?? "—"}</td>
                      <td className="py-3 px-4">
                        {lead.industry ? (
                          <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{lead.industry}</span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          lead.status === "contacted" ? "bg-blue-100 text-blue-700" :
                          lead.status === "replied" ? "bg-green-100 text-green-700" :
                          lead.status === "bounced" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>{lead.status ?? "new"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {selectedLeads.size > 0
              ? `${selectedLeads.size} lead${selectedLeads.size > 1 ? "s" : ""} selected`
              : "Select leads to add to your pipeline"}
          </p>
          <button
            onClick={handleSaveLeads}
            disabled={selectedLeads.size === 0 || saving}
            className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save {selectedLeads.size > 0 ? `${selectedLeads.size} lead${selectedLeads.size > 1 ? "s" : ""}` : "leads"}
          </button>
        </div>
      </main>
    </div>
  );
}
