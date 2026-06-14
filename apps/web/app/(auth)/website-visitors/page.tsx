"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

const tabs = ["People", "Companies"] as const;
type Tab = (typeof tabs)[number];

export default function WebsiteVisitorsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("People");

  // Domain state
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [domain, setDomain] = useState("");
  const [identifyPeople, setIdentifyPeople] = useState(true);
  const [identifyCompanies, setIdentifyCompanies] = useState(true);
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  // Filter panel
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
  const [phoneFilter, setPhoneFilter] = useState("");

  const snippetCode = `<script src="https://aryasdr.in/tracker.js" data-domain="${domain || "example.com"}"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode);
    } catch {
      // fallback: noop
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep(1);
    setDomain("");
    setIdentifyPeople(true);
    setIdentifyCompanies(true);
    setBudgetEnabled(false);
    setCopied(false);
    setVerifying(true);
    setVerified(false);
  };

  const closeWizard = () => {
    setWizardOpen(false);
  };

  const goToStep2 = () => {
    setWizardStep(2);
    setCopied(false);
  };

  const goToStep3 = () => {
    setWizardStep(3);
    setVerifying(true);
    setVerified(false);
  };

  useEffect(() => {
    if (wizardStep === 3 && verifying) {
      const timer = setTimeout(() => {
        setVerifying(false);
        // Randomly decide verified or not (always succeed for demo)
        setVerified(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [wizardStep, verifying]);

  const handleDone = () => {
    if (domain.trim()) {
      setDomains((prev) => [...prev, domain.trim()]);
      setSelectedDomain(domain.trim());
    }
    closeWizard();
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
    setPhoneFilter("");
  };

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
            {selectedDomain || "Select domain"}
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>
          {domainDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20">
              {domains.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No domains added</div>
              ) : (
                domains.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setSelectedDomain(d);
                      setDomainDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-violet-50 transition ${
                      selectedDomain === d ? "text-[#6C47FF] font-medium" : "text-gray-700"
                    }`}
                  >
                    {d}
                  </button>
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
          Identified today <span className="font-medium text-gray-900">0</span>
        </span>
        <span>
          Identified (7d) <span className="font-medium text-gray-900">0</span>
        </span>
        <span>
          Identified (30d) <span className="font-medium text-gray-900">0</span>
        </span>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
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

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20">
        {/* Stacked card illustrations */}
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
      </div>

      {/* Add Domain Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

                  {domain.trim() && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                          <Globe className="h-4 w-4 text-[#6C47FF]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Website visitors - {domain}
                          </p>
                          <p className="text-xs text-gray-400">Auto-created campaign</p>
                        </div>
                      </div>
                    </div>
                  )}

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
                        We&apos;ll start identifying visitors on {domain} right away.
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
                        We&apos;ll keep checking &mdash; it may take a few minutes.
                      </p>
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
                    onClick={goToStep2}
                    disabled={!domain.trim()}
                    className="rounded-lg bg-[#6C47FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a38e0] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <input
                      type="text"
                      value={phoneFilter}
                      onChange={(e) => setPhoneFilter(e.target.value)}
                      placeholder="Has phone number"
                      className="mt-1 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm outline-none focus:border-[#6C47FF] transition"
                    />
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
                onClick={() => setFilterOpen(false)}
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
