"use client";

import { useState } from "react";
import {
  Search,
  MoreHorizontal,
  AlertTriangle,
  X,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Team Page                                                          */
/* ------------------------------------------------------------------ */

type Tab = "my-team" | "sender-invite";

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<Tab>("my-team");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [addAsSender, setAddAsSender] = useState(true);

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your senders, mailboxes, and sending capacity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Purchase mailboxes
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors"
            >
              + Invite
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("my-team")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "my-team"
                ? "border-b-2 border-violet-600 text-violet-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            My team
          </button>
          <button
            onClick={() => setActiveTab("sender-invite")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "sender-invite"
                ? "border-b-2 border-violet-600 text-violet-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sender invite settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "my-team" ? (
          <div>
            {/* Warning Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Issues you can fix
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Your primary mailbox is not connected
                  </p>
                </div>
                <button className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors">
                  Connect mailbox
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Name
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Status
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Campaigns
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Primary mailboxes
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Secondary mailboxes
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Calendar
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Dialer
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      {/* actions */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    {/* Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-violet-100 text-violet-700 font-semibold text-xs rounded-full flex items-center justify-center">
                          SK
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              Shashank Kumar
                            </span>
                            <span className="bg-violet-50 text-violet-700 text-xs px-2 py-0.5 rounded">
                              Owner
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            shashank@aryasdr.com
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center bg-red-50 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        Needs action
                      </span>
                    </td>
                    {/* Campaigns */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                        No campaigns
                      </span>
                    </td>
                    {/* Primary mailboxes */}
                    <td className="py-4 px-4">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </td>
                    {/* Secondary mailboxes */}
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-400">&mdash;</span>
                    </td>
                    {/* Calendar */}
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-400">&mdash;</span>
                    </td>
                    {/* Dialer */}
                    <td className="py-4 px-4">
                      <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                        Assign seat
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="py-4 px-4">
                      <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Sender invite settings
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              No sender invite settings configured yet.
            </p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full mx-4 p-6 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Invite teammates
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              We&apos;ll send them an email to setup their account.
            </p>

            {/* Email Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email addresses
              </label>
              <input
                type="text"
                placeholder="Enter emails, comma separated"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF]"
              />
            </div>

            {/* Role Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Role
              </label>
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm text-gray-900 focus:border-[#6C47FF] focus:outline-none focus:ring-1 focus:ring-[#6C47FF] bg-white"
                >
                  <option value="Owner">Owner</option>
                  <option value="Admin">Admin</option>
                  <option value="Member">Member</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={addAsSender}
                onChange={(e) => setAddAsSender(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#6C47FF] focus:ring-[#6C47FF]"
              />
              <span className="text-sm text-gray-700">
                Add user as a sender to all campaigns
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors">
                Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
