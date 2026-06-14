"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";

interface Lead {
  id: number;
  name: string;
  title: string;
  company: string;
  location: string;
  industry: string;
}

const leads: Lead[] = [
  { id: 1, name: "Rahul Sharma", title: "CEO", company: "FinStack", location: "Bangalore", industry: "Fintech" },
  { id: 2, name: "Priya Mehta", title: "Growth Lead", company: "SellSmart", location: "Mumbai", industry: "SaaS" },
  { id: 3, name: "Vikram Singh", title: "Founder", company: "TechBridge", location: "Delhi", industry: "B2B Software" },
  { id: 4, name: "Anita Patel", title: "CTO", company: "HRFlow", location: "Pune", industry: "HR Tech" },
  { id: 5, name: "Rohan Gupta", title: "VP Sales", company: "EdgeCRM", location: "Hyderabad", industry: "CRM" },
];

export default function FindLeadsResultsPage() {
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFor, setSearchFor] = useState("people");

  // Collapsible filter sections
  const [roleOpen, setRoleOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  // Role & seniority filters
  const [managementLevel, setManagementLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [titlesToInclude, setTitlesToInclude] = useState("");
  const [titlesToExclude, setTitlesToExclude] = useState("");
  const [exactMatch, setExactMatch] = useState(false);
  const [includePastRoles, setIncludePastRoles] = useState(false);

  const toggleLead = (id: number) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  };

  const clearAllFilters = () => {
    setManagementLevel("");
    setDepartment("");
    setTitlesToInclude("");
    setTitlesToExclude("");
    setExactMatch(false);
    setIncludePastRoles(false);
    setSearchQuery("");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left Filter Panel */}
      <aside className="w-80 shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-6">
            <Link href="/find-leads" className="hover:text-[#6C47FF] transition">
              Find leads
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 font-medium">Results</span>
          </div>

          {/* Search for */}
          <div className="mb-5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Search for
            </label>
            <select
              value={searchFor}
              onChange={(e) => setSearchFor(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
            >
              <option value="people">People</option>
              <option value="companies">Companies</option>
            </select>
          </div>

          {/* Role & seniority section */}
          <div className="border-t border-gray-100 pt-4 mb-2">
            <button
              onClick={() => setRoleOpen(!roleOpen)}
              className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
            >
              Role &amp; seniority
              {roleOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {roleOpen && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Management level</label>
                  <input
                    type="text"
                    value={managementLevel}
                    onChange={(e) => setManagementLevel(e.target.value)}
                    placeholder="e.g. C-Level, VP"
                    className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering, Sales"
                    className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Job titles to include</label>
                  <input
                    type="text"
                    value={titlesToInclude}
                    onChange={(e) => setTitlesToInclude(e.target.value)}
                    placeholder="e.g. CEO, CTO, Founder"
                    className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Job titles to exclude</label>
                  <input
                    type="text"
                    value={titlesToExclude}
                    onChange={(e) => setTitlesToExclude(e.target.value)}
                    placeholder="e.g. Intern, Assistant"
                    className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Exact match only</span>
                  <button
                    onClick={() => setExactMatch(!exactMatch)}
                    className={`relative h-5 w-9 rounded-full transition ${
                      exactMatch ? "bg-[#6C47FF]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        exactMatch ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Include past roles</span>
                  <button
                    onClick={() => setIncludePastRoles(!includePastRoles)}
                    className={`relative h-5 w-9 rounded-full transition ${
                      includePastRoles ? "bg-[#6C47FF]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        includePastRoles ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Person location section */}
          <div className="border-t border-gray-100 pt-4 mb-2">
            <button
              onClick={() => setLocationOpen(!locationOpen)}
              className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
            >
              Person location
              {locationOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {locationOpen && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="e.g. Bangalore, Mumbai"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                />
              </div>
            )}
          </div>

          {/* Company attributes section */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <button
              onClick={() => setCompanyOpen(!companyOpen)}
              className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
            >
              Company attributes
              {companyOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {companyOpen && (
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  placeholder="Company name"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                />
                <input
                  type="text"
                  placeholder="Industry"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                />
                <input
                  type="text"
                  placeholder="Employee count (e.g. 10-50)"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                />
              </div>
            )}
          </div>

          {/* Clear all filters */}
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-500 hover:text-red-700 transition font-medium"
          >
            Clear all filters
          </button>
        </div>
      </aside>

      {/* Right Results Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search results..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#6C47FF] transition"
            />
          </div>

          {/* Result count */}
          <p className="text-sm text-gray-500 mb-4">
            Showing <span className="font-semibold text-gray-900">50</span> of{" "}
            <span className="font-semibold text-gray-900">271,514,091</span> people
          </p>

          {/* Results Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="py-3 px-4 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === leads.length}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF] cursor-pointer accent-[#6C47FF]"
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Company
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Location
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Industry
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-50 transition hover:bg-violet-50/50 ${
                      selectedLeads.has(lead.id) ? "bg-violet-50/30" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => toggleLead(lead.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF] cursor-pointer accent-[#6C47FF]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{lead.name}</span>
                        <span className="ml-1 text-sm text-gray-500">
                          {lead.title} at {lead.company}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{lead.company}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{lead.location}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {lead.industry}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {selectedLeads.size > 0
              ? `${selectedLeads.size} lead${selectedLeads.size > 1 ? "s" : ""} selected`
              : "Apply filters to continue"}
          </p>
          <button className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition">
            Apply filters to continue
          </button>
        </div>
      </main>
    </div>
  );
}
