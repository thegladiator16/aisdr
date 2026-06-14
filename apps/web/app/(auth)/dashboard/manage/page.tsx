"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  UserPlus,
  Send,
  MessageCircle,
  Calendar,
  ClipboardList,
  Target,
  Lock,
  Search,
  Pencil,
  Trash2,
  Coins,
} from "lucide-react";

type MainTab = "overview" | "outbound" | "replies" | "guardrails";
type OutboundSubTab = "knowledge" | "defaults";
type ProofSubTab = "highlights" | "customers" | "case-studies";
type GuardrailsSubTab = "dnc" | "banned";
type DncSubTab = "emails" | "domains" | "phones" | "crm";

export default function ManageAryaPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [showRemaining, setShowRemaining] = useState(true);
  const [outboundSub, setOutboundSub] = useState<OutboundSubTab>("knowledge");
  const [proofSub, setProofSub] = useState<ProofSubTab>("highlights");
  const [guardrailsSub, setGuardrailsSub] = useState<GuardrailsSubTab>("dnc");
  const [dncSub, setDncSub] = useState<DncSubTab>("emails");

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "outbound", label: "Outbound sequences" },
    { key: "replies", label: "Autonomous replies" },
    { key: "guardrails", label: "Guardrails" },
  ];

  const quests = [
    {
      title: "Connect your primary mailbox",
      next: true,
      description:
        "Enable email sending, reply forwarding, and meeting tracking",
      credits: 200,
      action: "Connect mailbox",
    },
    {
      title: "Set up email signature",
      next: false,
      description:
        "Add the signature Arya should use when sending from your mailbox",
      credits: 200,
      action: "Set up signature",
    },
    {
      title: "Launch a signal-based campaign",
      next: false,
      description:
        "Reach prospects the moment they hit a buying-intent trigger",
      credits: 200,
      action: "Set up signals",
    },
    {
      title: "Add secondary mailboxes",
      next: false,
      description:
        "Scale daily send volume across multiple inboxes without hurting deliverability",
      credits: 1000,
      action: "Buy mailboxes",
    },
    {
      title: "Turn on autopilot",
      next: false,
      description:
        "Hand Arya the wheel to run outbound end-to-end without your approval",
      credits: 400,
      action: "Enable autopilot",
    },
  ];

  const highlights = [
    "3x more meetings",
    "80% cost savings vs human SDR",
    "Setup in 30 minutes",
    "WhatsApp + Email outreach",
  ];

  const escalationRules = [
    "If the lead asks to unsubscribe or opt out",
    "If Arya is unsure or missing required context",
    "If the lead expresses strong displeasure, hostility, or directly criticizes the quality of the outreach",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Arya</h1>
        <Link
          href="/campaigns"
          className="rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
        >
          + New campaign
        </Link>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-violet-600 text-violet-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================== OVERVIEW TAB ======================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Onboarding Quests */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-gray-900">Onboarding quests</h2>
                <span className="text-sm text-gray-500">0/13 complete</span>
              </div>
              <button className="text-sm text-gray-500 hover:text-gray-700">
                Hide
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full mb-5">
              <div
                className="h-full bg-violet-600 rounded-full"
                style={{ width: "0%" }}
              />
            </div>

            {/* Remaining toggle */}
            <button
              onClick={() => setShowRemaining(!showRemaining)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4"
            >
              Remaining
              {showRemaining ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showRemaining && (
              <div className="space-y-4">
                {quests.map((quest) => (
                  <div
                    key={quest.title}
                    className="flex items-center gap-4 py-2"
                  >
                    {/* Checkbox circle */}
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">
                          {quest.title}
                        </span>
                        {quest.next && (
                          <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Next
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {quest.description}
                      </p>
                    </div>

                    {/* Credits */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs text-gray-600">
                        Earn {quest.credits} credits
                      </span>
                    </div>

                    {/* Action button */}
                    <button className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      {quest.action}
                    </button>
                  </div>
                ))}

                <div className="flex justify-center pt-2">
                  <button className="text-sm font-medium text-violet-600 hover:text-violet-700">
                    Load more (8)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Arya's Recent Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <h2 className="font-bold text-gray-900">
                  Arya&apos;s recent progress
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <select className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white">
                  <option>Last month</option>
                </select>
                <select className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white">
                  <option>All senders</option>
                </select>
                <Link
                  href="#"
                  className="text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  View all
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  icon: UserPlus,
                  label: "New leads enrolled",
                  value: "0",
                },
                { icon: Send, label: "Messages sent", value: "0" },
                {
                  icon: MessageCircle,
                  label: "Positive responses",
                  value: "0",
                },
                { icon: Calendar, label: "Meetings booked", value: "0" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-gray-200 bg-white p-5"
                >
                  <stat.icon className="h-5 w-5 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Arya needs input on */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-6">
              Tasks Arya needs input on
            </h2>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium text-gray-900">No tasks right now</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                When Arya needs your input on messages or approvals, they will
                show up here.
              </p>
            </div>
          </div>

          {/* Top Performing Campaigns */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-6">
              Arya&apos;s top performing campaigns
            </h2>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Target className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium text-gray-900">No campaigns yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Top performing campaigns will appear here once you have
                activity.
              </p>
            </div>
          </div>

          {/* Latest Activity */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-6">
              Arya&apos;s latest activity
            </h2>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium text-gray-900">No activity yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Arya&apos;s recent emails, responses, and enrichments will show
                up here.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================== OUTBOUND SEQUENCES TAB ======================== */}
      {activeTab === "outbound" && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-6">
              {(
                [
                  { key: "knowledge", label: "Knowledge" },
                  { key: "defaults", label: "Default settings" },
                ] as { key: OutboundSubTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setOutboundSub(tab.key)}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    outboundSub === tab.key
                      ? "border-b-2 border-violet-600 text-violet-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {outboundSub === "knowledge" && (
            <div className="space-y-6">
              {/* Shared campaign coaching */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="font-bold text-gray-900">
                    Shared campaign coaching
                  </h2>
                  <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    + Add coaching point
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Coaching that applies to every campaign, unless you turn it off
                  for one.
                </p>
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-900">
                    No coaching points yet
                  </p>
                </div>
                <div className="flex justify-center">
                  <button className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors">
                    + Add your first coaching point
                  </button>
                </div>
              </div>

              {/* Shared proof & results */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="font-bold text-gray-900">
                    Shared proof &amp; results
                  </h2>
                  <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    + Add proof
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Wins, customers, and case studies Arya can mention.
                </p>

                {/* Proof sub-tabs */}
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex gap-6">
                    {(
                      [
                        { key: "highlights", label: "Highlights" },
                        { key: "customers", label: "Customers" },
                        { key: "case-studies", label: "Case studies" },
                      ] as { key: ProofSubTab; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setProofSub(tab.key)}
                        className={`pb-3 text-sm font-medium transition-colors ${
                          proofSub === tab.key
                            ? "border-b-2 border-violet-600 text-violet-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {proofSub === "highlights" && (
                  <div className="space-y-2">
                    {highlights.map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                      >
                        <span className="text-sm text-gray-700">{item}</span>
                        <div className="flex items-center gap-2">
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {proofSub === "customers" && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm text-gray-500">
                      No customers added yet.
                    </p>
                  </div>
                )}

                {proofSub === "case-studies" && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm text-gray-500">
                      No case studies added yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {outboundSub === "defaults" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-gray-500">
                Default settings will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================== AUTONOMOUS REPLIES TAB ======================== */}
      {activeTab === "replies" && (
        <div className="space-y-6">
          {/* Escalation rules */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">
              When should Arya escalate the conversation to a human?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Set the rules to escalate the lead to the sender for review.
            </p>
            <div className="space-y-3">
              {escalationRules.map((rule) => (
                <div
                  key={rule}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <span className="text-sm text-gray-700">{rule}</span>
                  <Lock className="h-4 w-4 text-gray-400 shrink-0 ml-4" />
                </div>
              ))}
            </div>
            <button className="mt-4 text-sm font-medium text-violet-600 hover:text-violet-700">
              + Add escalation rule
            </button>
          </div>

          {/* Knowledge base */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Knowledge base</h2>
            <p className="text-sm text-gray-500 mb-5">
              Give Arya more context about your campaigns.
            </p>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Learn from past conversations
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Allow Arya to learn from previous email threads
                </p>
              </div>
              {/* Toggle - off state */}
              <div className="h-5 w-9 rounded-full bg-gray-200 relative cursor-pointer">
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform" />
              </div>
            </div>
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              + Add knowledge
            </button>
          </div>

          {/* Reply coaching */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Reply coaching</h2>
            <p className="text-sm text-gray-500 mb-5">
              Guide Arya on what content to write to prospects when replying.
            </p>
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              + Add coaching item
            </button>
          </div>

          {/* Qualification criteria */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">
              Qualification criteria
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Arya will first do web research to confirm if the lead meets
              qualification criteria.
            </p>
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              + Add qualification criterion
            </button>
          </div>
        </div>
      )}

      {/* ======================== GUARDRAILS TAB ======================== */}
      {activeTab === "guardrails" && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-6">
              {(
                [
                  { key: "dnc", label: "Do not contact" },
                  { key: "banned", label: "Banned phrases" },
                ] as { key: GuardrailsSubTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setGuardrailsSub(tab.key)}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    guardrailsSub === tab.key
                      ? "border-b-2 border-violet-600 text-violet-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {guardrailsSub === "dnc" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm text-gray-500">
                  Arya will never contact anyone on these lists.
                </p>
                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Manage lists
                  </button>
                  <button className="rounded-lg bg-[#6C47FF] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors">
                    + Add
                  </button>
                </div>
              </div>

              {/* DNC inner tabs */}
              <div className="border-b border-gray-200 mb-4">
                <div className="flex gap-6">
                  {(
                    [
                      { key: "emails", label: "Email addresses" },
                      { key: "domains", label: "Company domains" },
                      { key: "phones", label: "Phone numbers" },
                      { key: "crm", label: "CRM" },
                    ] as { key: DncSubTab; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setDncSub(tab.key)}
                      className={`pb-3 text-sm font-medium transition-colors ${
                        dncSub === tab.key
                          ? "border-b-2 border-violet-600 text-violet-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${
                    dncSub === "emails"
                      ? "email addresses"
                      : dncSub === "domains"
                        ? "company domains"
                        : dncSub === "phones"
                          ? "phone numbers"
                          : "CRM entries"
                  }...`}
                  className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-900">
                  No{" "}
                  {dncSub === "emails"
                    ? "email addresses"
                    : dncSub === "domains"
                      ? "company domains"
                      : dncSub === "phones"
                        ? "phone numbers"
                        : "CRM entries"}{" "}
                  in DNC list
                </p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Add{" "}
                  {dncSub === "emails"
                    ? "email addresses"
                    : dncSub === "domains"
                      ? "company domains"
                      : dncSub === "phones"
                        ? "phone numbers"
                        : "CRM entries"}{" "}
                  to prevent contacting them
                </p>
              </div>
            </div>
          )}

          {guardrailsSub === "banned" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm text-gray-500">
                  Arya will never use these phrases in outreach.
                </p>
                <button className="rounded-lg bg-[#6C47FF] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors">
                  + Add phrase
                </button>
              </div>

              {/* Search bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search banned phrases..."
                  className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-900">
                  No banned phrases yet
                </p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Add phrases that Arya should never use in outreach messages.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
