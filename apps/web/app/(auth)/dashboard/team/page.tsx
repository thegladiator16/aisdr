"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X, ChevronDown, Copy, Check } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Team Page                                                          */
/* ------------------------------------------------------------------ */

type MemberStatus = "invited" | "active" | "revoked";

type TeamMember = {
  id: string;
  email: string;
  roleName: string;
  status: MemberStatus;
  inviteToken: string | null;
  inviteLink: string | null;
  addAsSender: boolean;
  invitedAt: string;
  joinedAt: string | null;
  acceptedByName: string | null;
};

type TeamRole = {
  id: string;
  name: string;
  isSystem: boolean;
};

type Tab = "my-team" | "sender-invite";

type InviteOutcome = {
  email: string;
  inviteLink?: string;
  error?: string;
};

function statusBadgeClass(status: MemberStatus) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700";
    case "revoked":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function statusLabel(status: MemberStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "revoked":
      return "Revoked";
    default:
      return "Invited";
  }
}

function initials(value: string) {
  return value.slice(0, 2).toUpperCase();
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<Tab>("my-team");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState("");

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [addAsSender, setAddAsSender] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteOutcomes, setInviteOutcomes] = useState<InviteOutcome[] | null>(
    null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/roles"),
      ]);

      if (membersRes.ok) {
        const json = await membersRes.json();
        setMembers(json.data ?? []);
      } else {
        toast.error("Could not load team members");
      }

      if (rolesRes.ok) {
        const json = await rolesRes.json();
        const fetchedRoles: TeamRole[] = json.data ?? [];
        setRoles(fetchedRoles);
        setInviteRole((prev) => {
          if (fetchedRoles.some((r) => r.name === prev)) return prev;
          const member = fetchedRoles.find((r) => r.name === "Member");
          return member ? member.name : fetchedRoles[0]?.name ?? prev;
        });
      }
    } catch {
      toast.error("Could not load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetInviteForm = () => {
    setInviteEmails("");
    setAddAsSender(true);
    setInviteOutcomes(null);
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    resetInviteForm();
  };

  const handleSubmitInvite = async () => {
    const emails = Array.from(
      new Set(
        inviteEmails
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /\S+@\S+\.\S+/.test(e))
      )
    );

    if (emails.length === 0) {
      toast.error("Enter at least one valid email address");
      return;
    }

    setSubmitting(true);
    const outcomes: InviteOutcome[] = [];

    for (const email of emails) {
      try {
        const res = await fetch("/api/team/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            roleName: inviteRole,
            addAsSender,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          outcomes.push({
            email,
            error: json.error ?? "Failed to create invite",
          });
        } else {
          outcomes.push({ email, inviteLink: json.inviteLink });
        }
      } catch {
        outcomes.push({ email, error: "Network error" });
      }
    }

    setSubmitting(false);
    setInviteOutcomes(outcomes);

    const successCount = outcomes.filter((o) => o.inviteLink).length;
    if (successCount > 0) {
      toast.success(
        `${successCount} invite link${
          successCount > 1 ? "s" : ""
        } created — copy and send to each person`
      );
      loadData();
    }
    if (successCount < outcomes.length) {
      toast.error("Some invites could not be created");
    }
  };

  const handleCopy = async (key: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedKey(key);
      toast.success("Invite link copied");
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleRevoke = async (member: TeamMember) => {
    setBusyMemberId(member.id);
    try {
      const res = await fetch(`/api/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as { error?: string });
        toast.error(json.error ?? "Could not revoke invite");
        return;
      }
      toast.success("Invite revoked");
      loadData();
    } catch {
      toast.error("Could not revoke invite");
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    setBusyMemberId(member.id);
    try {
      const res = await fetch(`/api/team/members/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as { error?: string });
        toast.error(json.error ?? "Could not remove member");
        return;
      }
      toast.success("Removed from team");
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch {
      toast.error("Could not remove member");
    } finally {
      setBusyMemberId(null);
    }
  };

  const filteredMembers = members.filter((m) =>
    (m.email + " " + (m.acceptedByName ?? ""))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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
            <button
              disabled
              title="Coming soon"
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
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
                      Role
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Status
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Invited
                    </th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-3 px-4 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-sm text-gray-400"
                      >
                        Loading team members…
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-sm text-gray-400"
                      >
                        {members.length === 0
                          ? 'Nobody invited yet — it’s just you. Click "+ Invite" to add teammates.'
                          : "No members match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        {/* Name / Email */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-violet-100 text-violet-700 font-semibold text-xs rounded-full flex items-center justify-center">
                              {initials(member.acceptedByName ?? member.email)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.acceptedByName ?? member.email}
                              </p>
                              {member.acceptedByName && (
                                <p className="text-xs text-gray-500">
                                  {member.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Role */}
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700">
                            {member.roleName}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClass(
                              member.status
                            )}`}
                          >
                            {statusLabel(member.status)}
                          </span>
                        </td>
                        {/* Invited date */}
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-500">
                            {new Date(member.invitedAt).toLocaleDateString()}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {member.status === "invited" &&
                              member.inviteLink && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleCopy(member.id, member.inviteLink!)
                                    }
                                    className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1"
                                  >
                                    {copiedKey === member.id ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                    Copy link
                                  </button>
                                  <button
                                    disabled={busyMemberId === member.id}
                                    onClick={() => handleRevoke(member)}
                                    className="text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                            {member.status !== "invited" && (
                              <button
                                disabled={busyMemberId === member.id}
                                onClick={() => handleRemove(member)}
                                className="text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
              Not available yet — per-sender assignment isn&apos;t built yet.
            </p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeInviteModal}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full mx-4 p-6 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Invite teammates
              </h2>
              <button
                onClick={closeInviteModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteOutcomes ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Copy each link below and send it to the person yourself — we
                  don&apos;t send emails automatically.
                </p>
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {inviteOutcomes.map((o) => (
                    <div
                      key={o.email}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {o.email}
                      </p>
                      {o.inviteLink ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            readOnly
                            value={o.inviteLink}
                            className="flex-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 border border-gray-200"
                          />
                          <button
                            onClick={() => handleCopy(o.email, o.inviteLink!)}
                            className="text-xs font-medium text-violet-600 hover:text-violet-700 shrink-0"
                          >
                            {copiedKey === o.email ? "Copied" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-red-600 mt-1">{o.error}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={closeInviteModal}
                    className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  We&apos;ll generate a shareable invite link for each email —
                  you send it yourself.
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
                      {roles.length === 0 ? (
                        <option value="Member">Member</option>
                      ) : (
                        roles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))
                      )}
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
                    onClick={closeInviteModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitInvite}
                    disabled={submitting}
                    className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3ad4] transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Inviting…" : "Invite"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
