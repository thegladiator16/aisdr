"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Globe,
  Search,
  SlidersHorizontal,
  User,
  Plus,
  X,
  Check,
  Copy,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Trash2,
} from "lucide-react";

const tabs = ["People", "Companies"] as const;
type Tab = (typeof tabs)[number];

type TrackedDomain = {
  id: string;
  domain: string;
  identifyPeople: boolean;
  identifyCompanies: boolean;
  budgetEnabled: boolean;
  verificationToken: string;
  verified: boolean;
  createdAt: string;
};

type Visitor = {
  id: string;
  domain: string;
  visitorEmail: string | null;
  company: string | null;
  jobTitle: string | null;
  pagesViewed: string[] | null;
  sessions: number | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  qualified: boolean | null;
  seniority: string | null;
  department: string | null;
  location: string | null;
  phone: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

export default function WebsiteVisitorsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("People");

  // Domain state
  const [domains, setDomains] = useState<TrackedDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);

  // Visitors state
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [domain, setDomain] = useState("");
  const [identifyPeople, setIdentifyPeople] = useState(true);
  const [identifyCompanies, setIdentifyCompanies] = useState(true);
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdDomain, setCreatedDomain] = useState<TrackedDomain | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Filter panel (draft state — committed to appliedFilters on "Apply filters")
  const [filterOpen, setFilterOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState("any");
  const [firstSeen, setFirstSeen] = useState("any");
  const [pageviewsMin, setPageviewsMin] = useState("");
  const [pageviewsMax, setPageviewsMax] = useState("");
  const [sessionsMin, setSessionsMin] = useState("");
  const [sessionsMax, setSessionsMax] = useState("");
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [keyPages, setKeyPages] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [qualified, setQualified] = useState("all");
  const [titleFilter, setTitleFilter] = useState("");
  const [seniority, setSeniority] = useState("any");
  const [departmentFilter, setDepartmentFilter] = useState("any");
  const [locationFilter, setLocationFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    lastSeen: "any",
    firstSeen: "any",
    pageviewsMin: "",
    pageviewsMax: "",
    sessionsMin: "",
    sessionsMax: "",
    repeatOnly: false,
    keyPages: "",
    source: "",
    medium: "",
    campaign: "",
    qualified: "all",
    titleFilter: "",
    seniority: "any",
    departmentFilter: "any",
    locationFilter: "",
    emailFilter: "",
    phoneFilter: false,
  });

  const snippetCode = createdDomain
    ? `<script src="https://aryasdr.in/tracker.js" data-domain="${createdDomain.domain}" data-token="${createdDomain.verificationToken}"></script>`
    : `<script src="https://aryasdr.in/tracker.js" data-domain="${domain || "example.com"}"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode);
    } catch {
      // fallback: noop
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadDomains = useCallback(async () => {
    setLoadingDomains(true);
    try {
      const res = await fetch("/api/website-visitors/domains", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setDomains(json.domains ?? []);
      }
    } catch {
      toast.error("Could not load tracked domains");
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  const loadVisitors = useCallback(async () => {
    setLoadingVisitors(true);
    try {
      const params = new URLSearchParams();
      if (selectedDomain) params.set("domain", selectedDomain);
      if (searchQuery) params.set("search", searchQuery);
      if (appliedFilters.lastSeen !== "any") params.set("lastSeen", appliedFilters.lastSeen);
      if (appliedFilters.firstSeen !== "any") params.set("firstSeen", appliedFilters.firstSeen);
      if (appliedFilters.pageviewsMin) params.set("pageviewsMin", appliedFilters.pageviewsMin);
      if (appliedFilters.pageviewsMax) params.set("pageviewsMax", appliedFilters.pageviewsMax);
      if (appliedFilters.sessionsMin) params.set("sessionsMin", appliedFilters.sessionsMin);
      if (appliedFilters.sessionsMax) params.set("sessionsMax", appliedFilters.sessionsMax);
      if (appliedFilters.repeatOnly) params.set("repeatOnly", "true");
      if (appliedFilters.keyPages) params.set("keyPages", appliedFilters.keyPages);
      if (appliedFilters.source) params.set("source", appliedFilters.source);
      if (appliedFilters.medium) params.set("medium", appliedFilters.medium);
      if (appliedFilters.campaign) params.set("campaign", appliedFilters.campaign);
      if (appliedFilters.qualified !== "all") params.set("qualified", appliedFilters.qualified);
      if (appliedFilters.titleFilter) params.set("title", appliedFilters.titleFilter);
      if (appliedFilters.seniority !== "any") params.set("seniority", appliedFilters.seniority);
      if (appliedFilters.departmentFilter !== "any")
        params.set("department", appliedFilters.departmentFilter);
      if (appliedFilters.locationFilter) params.set("location", appliedFilters.locationFilter);
      if (appliedFilters.emailFilter) params.set("email", appliedFilters.emailFilter);
      if (appliedFilters.phoneFilter) params.set("hasPhone", "true");

      const res = await fetch(`/api/website-visitors?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setVisitors(json.visitors ?? []);
      }
    } catch {
      toast.error("Could not load visitors");
    } finally {
      setLoadingVisitors(false);
    }
  }, [selectedDomain, searchQuery, appliedFilters]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep(1);
    setDomain("");
    setIdentifyPeople(true);
    setIdentifyCompanies(true);
    setBudgetEnabled(false);
    setCopied(false);
    setCreatedDomain(null);
    setVerifying(false);
    setVerifyError(null);
    setVerified(false);
  };

  const closeWizard = () => {
    setWizardOpen(false);
  };

  const handleCreateDomain = async () => {
    if (!domain.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/website-visitors/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim(),
          identifyPeople,
          identifyCompanies,
          budgetEnabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not add domain");
        return;
      }
      setCreatedDomain(json.domain);
      setWizardStep(2);
      setCopied(false);
    } catch {
      toast.error("Could not add domain");
    } finally {
      setCreating(false);
    }
  };

  const goToStep3 = () => {
    setWizardStep(3);
    handleVerify();
  };

  const handleVerify = async () => {
    if (!createdDomain) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/website-visitors/domains/${createdDomain.id}/verify`, {
        method: "POST",
      });
      const json = await res.json();
      setVerified(!!json.verified);
      if (!json.verified) setVerifyError(json.error ?? "Snippet not detected yet");
    } catch {
      setVerified(false);
      setVerifyError("Could not reach domain to verify");
    } finally {
      setVerifying(false);
    }
  };

  const handleDone = () => {
    if (createdDomain) {
      setSelectedDomain(createdDomain.domain);
    }
    closeWizard();
    loadDomains();
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      const res = await fetch(`/api/website-visitors/domains/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not remove domain");
        return;
      }
      setDomains((prev) => prev.filter((d) => d.id !== id));
      if (domains.find((d) => d.id === id)?.domain === selectedDomain) {
        setSelectedDomain("");
      }
      toast.success("Domain removed");
    } catch {
      toast.error("Could not remove domain");
    }
  };

  const clearAllFilters = () => {
    setLastSeen("any");
    setFirstSeen("any");
    setPageviewsMin("");
    setPageviewsMax("");
    setSessionsMin("");
    setSessionsMax("");
    setRepeatOnly(false);
    setKeyPages("");
    setSource("");
    setMedium("");
    setCampaign("");
    setQualified("all");
    setTitleFilter("");
    setSeniority("any");
    setDepartmentFilter("any");
    setLocationFilter("");
    setEmailFilter("");
    setPhoneFilter(false);
  };

  const applyFilters = () => {
    setAppliedFilters({
      lastSeen,
      firstSeen,
      pageviewsMin,
      pageviewsMax,
      sessionsMin,
      sessionsMax,
      repeatOnly,
      keyPages,
      source,
      medium,
      campaign,
      qualified,
      titleFilter,
      seniority,
      departmentFilter,
      locationFilter,
      emailFilter,
      phoneFilter,
    });
    setFilterOpen(false);
  };

  const now = Date.now();
  const identifiedToday = visitors.filter(
    (v) => v.firstSeenAt && now - new Date(v.firstSeenAt).getTime() < 24 * 60 * 60 * 1000
  ).length;
  const identified7d = visitors.filter(
    (v) => v.firstSeenAt && now - new Date(v.firstSeenAt).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;
  const identified30d = visitors.filter(
    (v) => v.firstSeenAt && now - new Date(v.firstSeenAt).getTime() < 30 * 24 * 60 * 60 * 1000
  ).length;

  const displayedVisitors =
    activeTab === "Companies"
      ? Array.from(new Set(visitors.map((v) => v.company).filter(Boolean))).map(
          (company) => visitors.find((v) => v.company === company)!
        )
      : visitors;

  const stepIndicator = (currentStep: 1 | 2 | 3) => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
              s < currentStep
                ? "bg-green-100 text-green-700"
                : s === currentStep
                ? "bg-[#6C47FF] text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {s < currentStep ? <Check className="h-3.5 w-3.5" /> : s}
          </div>
          {s < 3 && (
            <div
              className={`h-0.5 w-8 ${
                s < currentStep ? "bg-green-300" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Website visitors</h1>
        <div className="relative">
          <button
            onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Globe className="h-4 w-4" />
            {selectedDomain || "All domains"}
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>
          {domainDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20">
              <button
                onClick={() => {
                  setSelectedDomain("");
                  setDomainDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-violet-50 transition ${
                  !selectedDomain ? "text-[#6C47FF] font-medium" : "text-gray-700"
                }`}
              >
                All domains
              </button>
              {loadingDomains ? (
                <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>
              ) : domains.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No domains added</div>
              ) : (
                domains.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-4 py-2 hover:bg-violet-50 transition group"
                  >
                    <button
                      onClick={() => {
                        setSelectedDomain(d.domain);
                        setDomainDropdownOpen(false);
                      }}
                      className={`flex-1 text-left text-sm ${
                        selectedDomain === d.domain ? "text-[#6C47FF] font-medium" : "text-gray-700"
                      }`}
                    >
                      {d.domain}
                      {!d.verified && (
                        <span className="ml-2 text-[10px] text-amber-600">unverified</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteDomain(d.id)}
                      className="text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setDomainDropdownOpen(false);
                    openWizard();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#6C47FF] hover:bg-violet-50 transition font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add domain
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mt-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-[#6C47FF] text-[#6C47FF]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="flex gap-6 mt-4 text-sm text-gray-500">
        <span>
          Identified today <span className="font-medium text-gray-900">{identifiedToday}</span>
        </span>
        <span>
          Identified (7d) <span className="font-medium text-gray-900">{identified7d}</span>
        </span>
        <span>
          Identified (30d) <span className="font-medium text-gray-900">{identified30d}</span>
        </span>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visitors..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-violet-500 transition"
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {loadingVisitors ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
        </div>
      ) : displayedVisitors.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">
                  {activeTab === "Companies" ? "Company" : "Visitor"}
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Domain</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Sessions</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Source</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {displayedVisitors.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5 text-gray-900">
                    {activeTab === "Companies" ? v.company ?? "Unknown" : v.visitorEmail ?? "Anonymous"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{v.jobTitle ?? "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.domain}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.sessions ?? 1}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.source ?? "-"}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {v.lastSeenAt ? new Date(v.lastSeenAt).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative h-24 w-32 mb-6">
            <div className="absolute top-0 left-0 flex h-16 w-28 items-center justify-center rounded-lg border-2 border-gray-200 bg-white opacity-30">
              <User className="h-6 w-6 text-gray-300" />
            </div>
            <div className="absolute top-[-5px] left-[5px] flex h-16 w-28 items-center justify-center rounded-lg border-2 border-gray-200 bg-white opacity-50">
              <User className="h-6 w-6 text-gray-300" />
            </div>
            <div className="absolute top-[-10px] left-[10px] flex h-16 w-28 items-center justify-center rounded-lg border-2 border-gray-200 bg-white opacity-70">
              <User className="h-6 w-6 text-gray-300" />
            </div>
          </div>

          {domains.length === 0 ? (
            <>
              <h2 className="text-lg font-bold text-gray-900">
                Add your first domain to start tracking visitors
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Add a domain to identify visitors and enable automated outreach.
              </p>
              <button
                onClick={openWizard}
                className="mt-6 flex items-center gap-2 rounded-lg bg-[#6C47FF] px-6 py-2.5 text-white hover:bg-[#5a38e0] transition"
              >
                <Plus className="h-4 w-4" />
                Add domain
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900">No visitors identified yet</h2>
              <p className="mt-2 max-w-md text-center text-sm text-gray-500">
                Domain tracking and snippet verification are live, but matching an anonymous
                pageview to a real person or company needs a reverse-IP identity data provider,
                which isn&apos;t connected yet — so this list stays empty until that&apos;s wired up.
              </p>
            </>
          )}
        </div>
      )}

      {/* Add Domain Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Add domain</h2>
              <button
                onClick={closeWizard}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              {/* Step Indicator */}
              {stepIndicator(wizardStep)}

              {/* STEP 1 */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Website domain
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="example.com"
                      className="mt-1.5 w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Don&apos;t include &apos;https://&apos; or &apos;www&apos;
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={identifyPeople}
                        onChange={(e) => setIdentifyPeople(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-[#6C47FF]"
                      />
                      <span className="text-sm text-gray-700">
                        Identify people in the US
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={identifyCompanies}
                        onChange={(e) => setIdentifyCompanies(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-[#6C47FF]"
                      />
                      <span className="text-sm text-gray-700">
                        Identify companies globally
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Monthly budget</span>
                    <button
                      onClick={() => setBudgetEnabled(!budgetEnabled)}
                      className={`relative h-5 w-9 rounded-full transition ${
                        budgetEnabled ? "bg-[#6C47FF]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          budgetEnabled ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-900">
                    Install this snippet on your website
                  </h3>
                  <div className="relative rounded-lg bg-gray-900 p-4">
                    <pre className="text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {snippetCode}
                    </pre>
                    <button
                      onClick={handleCopy}
                      className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600 transition"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy code
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Paste this snippet before the closing &lt;/head&gt; tag on every page of your website.
                  </p>
                </div>
              )}

              {/* STEP 3 */}
              {wizardStep === 3 && (
                <div className="flex flex-col items-center justify-center py-8">
                  {verifying ? (
                    <>
                      <Loader2 className="h-10 w-10 text-[#6C47FF] animate-spin" />
                      <p className="mt-4 text-sm text-gray-600">
                        Verifying snippet installation...
                      </p>
                    </>
                  ) : verified ? (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-7 w-7 text-green-600" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-gray-900">
                        Domain added successfully!
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        The snippet was found on {createdDomain?.domain}.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle className="h-7 w-7 text-amber-600" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-gray-900">
                        Snippet not detected yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {verifyError ?? "We checked your homepage and couldn't find the snippet."}
                      </p>
                      <button
                        onClick={handleVerify}
                        className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        Check again
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              {wizardStep === 1 && (
                <>
                  <button
                    onClick={closeWizard}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDomain}
                    disabled={!domain.trim() || creating}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Continue to install snippet
                  </button>
                </>
              )}
              {wizardStep === 2 && (
                <>
                  <button
                    onClick={() => setWizardStep(1)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={goToStep3}
                    className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition"
                  >
                    I&apos;ve installed the snippet
                  </button>
                </>
              )}
              {wizardStep === 3 && !verifying && (
                <button
                  onClick={handleDone}
                  className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters Slide-in Panel */}
      {filterOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setFilterOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 z-50 h-full w-96 bg-white border-l border-gray-200 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setFilterOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-6">
              {/* VISIT & ACTIVITY */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Visit &amp; Activity
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Last seen</label>
                    <select
                      value={lastSeen}
                      onChange={(e) => setLastSeen(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    >
                      <option value="any">Any time</option>
                      <option value="1d">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">First seen</label>
                    <select
                      value={firstSeen}
                      onChange={(e) => setFirstSeen(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    >
                      <option value="any">Any time</option>
                      <option value="1d">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Pageviews min</label>
                      <input
                        type="number"
                        value={pageviewsMin}
                        onChange={(e) => setPageviewsMin(e.target.value)}
                        placeholder="0"
                        className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Pageviews max</label>
                      <input
                        type="number"
                        value={pageviewsMax}
                        onChange={(e) => setPageviewsMax(e.target.value)}
                        placeholder="100"
                        className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Sessions min</label>
                      <input
                        type="number"
                        value={sessionsMin}
                        onChange={(e) => setSessionsMin(e.target.value)}
                        placeholder="0"
                        className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Sessions max</label>
                      <input
                        type="number"
                        value={sessionsMax}
                        onChange={(e) => setSessionsMax(e.target.value)}
                        placeholder="50"
                        className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Repeat visitors only</span>
                    <button
                      onClick={() => setRepeatOnly(!repeatOnly)}
                      className={`relative h-5 w-9 rounded-full transition ${
                        repeatOnly ? "bg-[#6C47FF]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          repeatOnly ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* PAGES & SIGNALS */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pages &amp; Signals
                </h3>
                <div>
                  <label className="text-xs text-gray-500">Key pages</label>
                  <input
                    type="text"
                    value={keyPages}
                    onChange={(e) => setKeyPages(e.target.value)}
                    placeholder="/pricing, /demo, /contact"
                    className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                  />
                </div>
              </div>

              {/* ATTRIBUTION */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Attribution
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Source</label>
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="e.g. google, linkedin"
                      className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Medium</label>
                    <input
                      type="text"
                      value={medium}
                      onChange={(e) => setMedium(e.target.value)}
                      placeholder="e.g. cpc, organic"
                      className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Campaign</label>
                    <input
                      type="text"
                      value={campaign}
                      onChange={(e) => setCampaign(e.target.value)}
                      placeholder="e.g. spring_promo"
                      className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
                  </div>
                </div>
              </div>

              {/* QUALIFICATION */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Qualification
                </h3>
                <div>
                  <label className="text-xs text-gray-500">Qualified</label>
                  <select
                    value={qualified}
                    onChange={(e) => setQualified(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                  >
                    <option value="all">All</option>
                    <option value="qualified">Qualified</option>
                    <option value="unqualified">Unqualified</option>
                  </select>
                </div>
              </div>

              {/* LEAD ATTRIBUTES */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Lead Attributes
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Title</label>
                    <input
                      type="text"
                      value={titleFilter}
                      onChange={(e) => setTitleFilter(e.target.value)}
                      placeholder="e.g. CEO, VP Engineering"
                      className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Seniority</label>
                    <select
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    >
                      <option value="any">Any</option>
                      <option value="c-level">C-Level</option>
                      <option value="vp">VP</option>
                      <option value="director">Director</option>
                      <option value="manager">Manager</option>
                      <option value="individual">Individual Contributor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Department</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    >
                      <option value="any">Any</option>
                      <option value="engineering">Engineering</option>
                      <option value="sales">Sales</option>
                      <option value="marketing">Marketing</option>
                      <option value="product">Product</option>
                      <option value="finance">Finance</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Location</label>
                    <input
                      type="text"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      placeholder="e.g. Bangalore, Mumbai"
                      className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <input
                      type="text"
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      placeholder="e.g. @company.com"
                      className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Has phone number</span>
                    <button
                      onClick={() => setPhoneFilter(!phoneFilter)}
                      className={`relative h-5 w-9 rounded-full transition ${
                        phoneFilter ? "bg-[#6C47FF]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          phoneFilter ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-5 py-4 flex items-center justify-between">
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-500 hover:text-red-700 transition font-medium"
              >
                Clear all
              </button>
              <button
                onClick={applyFilters}
                className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
