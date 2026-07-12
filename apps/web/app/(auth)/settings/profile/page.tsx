"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertTriangle,
  Pencil,
  Mail,
  Phone,
  ExternalLink,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  FileSignature,
} from "lucide-react";
import SignatureEditor from "@/components/signature/SignatureEditor";

/* ------------------------------------------------------------------ */
/*  Connect Mailbox Modal                                              */
/* ------------------------------------------------------------------ */
function ConnectMailboxModal({ onClose }: { onClose: () => void }) {
  const [provider, setProvider] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const providers = [
    { id: "gmail", label: "Gmail", color: "bg-red-500" },
    { id: "outlook", label: "Outlook", color: "bg-blue-500" },
    { id: "other", label: "Other IMAP", color: "bg-gray-500" },
  ];

  const handleConnect = () => {
    if (!provider) return;
    if (provider === "gmail") {
      window.location.href = "/api/v1/integrations/gmail";
      return;
    }
    setConnecting(true);
    setTimeout(() => {
      toast.success("IMAP / Outlook support coming soon. Use Gmail for now.");
      setConnecting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Connect mailbox</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Select your email provider to connect your mailbox.</p>
          <div className="space-y-2">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                  provider === p.id
                    ? "border-[#6C47FF] bg-violet-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className={`h-8 w-8 ${p.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                  {p.label[0]}
                </div>
                <span className="text-sm font-medium text-gray-700">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={!provider || connecting}
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Change Password Modal (real Clerk password update)                 */
/* ------------------------------------------------------------------ */
function ChangePasswordModal({
  user,
  onClose,
}: {
  user: NonNullable<ReturnType<typeof useUser>["user"]>;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (user.passwordEnabled && !currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await user.updatePassword({
        currentPassword: user.passwordEnabled ? currentPassword : undefined,
        newPassword,
        signOutOfOtherSessions: true,
      });
      toast.success("Password updated");
      onClose();
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message ?? "Could not update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {user.passwordEnabled ? "Change password" : "Set a password"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {user.passwordEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2FA Modal (real Clerk TOTP)                                        */
/* ------------------------------------------------------------------ */
function TwoFactorModal({
  user,
  onClose,
  onEnable,
}: {
  user: NonNullable<ReturnType<typeof useUser>["user"]>;
  onClose: () => void;
  onEnable: () => void;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(true);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    user
      .createTOTP()
      .then((totp) => setSecret(totp.secret ?? null))
      .catch(() => toast.error("Could not start 2FA setup"))
      .finally(() => setLoadingSecret(false));
  }, [user]);

  const handleCopy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      await user.verifyTOTP({ code });
      toast.success("2FA enabled successfully");
      onEnable();
      onClose();
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message ?? "Invalid code — try again");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Set up Two-Factor Authentication
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600">
            Add this key to your authenticator app (Google Authenticator, Authy, etc.) —
            look for &quot;enter a setup key&quot; instead of scanning a QR code.
          </p>
          <div className="flex items-center justify-center">
            {loadingSecret ? (
              <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
            ) : secret ? (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700 hover:bg-gray-100 transition"
              >
                {secret.match(/.{1,4}/g)?.join(" ")}
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
            ) : (
              <p className="text-sm text-red-500">Could not generate a setup key</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Enter code from authenticator app
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={verifying || !secret}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors disabled:opacity-50"
            >
              {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable Field (inline add / edit pattern)                         */
/* ------------------------------------------------------------------ */
function EditableField({
  label,
  addLabel,
  value,
  onChange,
}: {
  label: string;
  addLabel: string;
  value: string;
  onChange: (v: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const save = async () => {
    setSaving(true);
    try {
      await onChange(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent w-48"
            placeholder={`Enter ${label.toLowerCase()}`}
          />
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#6C47FF] rounded-lg hover:bg-[#5a3ad4] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      ) : value ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">{value}</span>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Page                                                       */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"primary" | "secondary" | "dialer">("primary");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  /* Personalization context */
  const [city, setCity] = useState("");
  const [companies, setCompanies] = useState("");
  const [schools, setSchools] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  /* Security */
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  /* Mailbox modal + real connection status */
  const [showMailboxModal, setShowMailboxModal] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);

  /* Campaign membership */
  const [activeCampaigns, setActiveCampaigns] = useState<{ id: string; name: string; status: string | null }[]>([]);

  /* Email signature */
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [loadingSignature, setLoadingSignature] = useState(true);

  useEffect(() => {
    if (user) setFullName(user.fullName ?? "");
  }, [user]);

  useEffect(() => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        setCity(json.personalCity ?? "");
        setCompanies(json.previousCompanies ?? "");
        setSchools(json.previousSchools ?? "");
      })
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoadingProfile(false));

    fetch("/api/v1/integrations/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setGmailConnected(!!json.gmail))
      .catch(() => setGmailConnected(false));

    fetch("/api/user/signature", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setSignature(typeof json?.signature === "string" ? json.signature : ""))
      .catch(() => {})
      .finally(() => setLoadingSignature(false));

    fetch("/api/campaigns", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        const active = (json.data ?? []).filter(
          (c: any) => c.status === "active" || c.status === "paused"
        );
        setActiveCampaigns(active);
      })
      .catch(() => {});
  }, []);

  const savePersonalization = async (
    field: "personalCity" | "previousCompanies" | "previousSchools",
    value: string,
    label: string
  ) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        toast.error(`Could not update ${label.toLowerCase()}`);
        return;
      }
      if (field === "personalCity") setCity(value);
      if (field === "previousCompanies") setCompanies(value);
      if (field === "previousSchools") setSchools(value);
      toast.success(`${label} updated`);
    } catch {
      toast.error(`Could not update ${label.toLowerCase()}`);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      await user.setProfileImage({ file });
      toast.success("Profile photo updated");
    } catch {
      toast.error("Could not update profile photo");
    }
  };

  const handleNameBlur = async () => {
    if (!user || !fullName.trim() || fullName === user.fullName) return;
    setSavingName(true);
    try {
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      await user.update({ firstName, lastName: rest.join(" ") || undefined });
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;
    try {
      await user.disableTOTP();
      toast.success("2FA disabled");
    } catch {
      toast.error("Could not disable 2FA");
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account details, security, and sender settings
        </p>
      </div>

      {/* Warning card */}
      {gmailConnected === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-amber-800">Issues you can fix</p>
              <p className="text-sm text-amber-700">Your primary mailbox is not connected</p>
            </div>
          </div>
          <button
            onClick={() => setShowMailboxModal(true)}
            className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
          >
            Connect mailbox
          </button>
        </div>
      )}

      {/* Profile section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user.imageUrl}
              alt="Avatar"
              className="h-14 w-14 rounded-full object-cover"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
            >
              <Pencil className="h-3 w-3 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={handleNameBlur}
                disabled={savingName}
                className="w-full px-3 py-2 bg-white text-sm text-gray-700 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select
                value="Owner"
                disabled
                className="w-full px-3 py-2 bg-gray-100 text-sm text-gray-700 rounded-lg border border-gray-200 cursor-not-allowed"
              >
                <option>Owner</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Context for personalizations */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Context for personalizations</h2>
        {loadingProfile ? (
          <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
        ) : (
          <div className="space-y-3">
            <EditableField
              label="City you live in"
              addLabel="+ Add city"
              value={city}
              onChange={(v) => savePersonalization("personalCity", v, "City")}
            />
            <div className="border-t border-gray-100">
              <EditableField
                label="Previous companies"
                addLabel="+ Add companies"
                value={companies}
                onChange={(v) => savePersonalization("previousCompanies", v, "Previous companies")}
              />
            </div>
            <div className="border-t border-gray-100">
              <EditableField
                label="Previous schools"
                addLabel="+ Add schools"
                value={schools}
                onChange={(v) => savePersonalization("previousSchools", v, "Previous schools")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Email signature */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-[#6C47FF]" />
              Email signature
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Appended to emails Arya sends from your mailbox
            </p>
          </div>
          <button
            onClick={() => setShowSignatureEditor(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            {signature.trim() ? "Edit signature" : "Set up signature"}
          </button>
        </div>
        {loadingSignature ? (
          <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
        ) : signature.trim() ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            {/^\s*<[a-z][\s\S]*>/i.test(signature) ? (
              // NOTE: dangerouslySetInnerHTML is safe here — this is the current
              // user's own signature, only rendered back to themselves.
              <div
                className="text-sm text-gray-800"
                dangerouslySetInnerHTML={{ __html: signature }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                {signature}
              </pre>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            No signature yet — set one up so Arya can sign off properly.
          </div>
        )}
      </div>

      {/* Account security */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Account security</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">
                {user.passwordEnabled ? "Change password" : "Set a password"}
              </p>
              <p className="text-xs text-gray-500">
                {user.passwordEnabled
                  ? "Update the password used to sign in"
                  : `Signed in via ${user.externalAccounts[0]?.provider ?? "an external provider"} — set a password to also sign in directly`}
              </p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {user.passwordEnabled ? "Change" : "Set password"}
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Two Factor Authentication (2FA)</p>
              {user.totpEnabled ? (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                  Enabled
                </span>
              ) : (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                  Not enabled
                </span>
              )}
            </div>
            <button
              onClick={() => {
                if (user.totpEnabled) {
                  handleDisable2FA();
                } else {
                  setShow2FAModal(true);
                }
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                user.totpEnabled
                  ? "text-red-600 border border-red-200 hover:bg-red-50"
                  : "text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {user.totpEnabled ? "Disable" : "Enable"}
            </button>
          </div>
        </div>
      </div>

      {/* Outreach channels */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Outreach channels</h2>
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("primary")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "primary"
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {gmailConnected === false && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            Primary mailbox
          </button>
          <button
            onClick={() => setActiveTab("secondary")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "secondary"
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Secondary mailboxes
          </button>
          <button
            onClick={() => setActiveTab("dialer")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "dialer"
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Dialer
          </button>
        </div>

        {activeTab === "primary" &&
          (gmailConnected === true ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <h3 className="text-sm font-semibold text-gray-900">Gmail connected</h3>
              <p className="text-sm text-gray-500">Your primary mailbox is connected and sending.</p>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Mail className="h-10 w-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-semibold text-gray-900">Connect mailbox</h3>
              <p className="text-sm text-gray-500">Your primary mailbox is not connected</p>
              <button
                onClick={() => setShowMailboxModal(true)}
                className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
              >
                Connect mailbox
              </button>
            </div>
          ))}

        {activeTab === "secondary" && (
          <div className="text-center py-8 text-sm text-gray-500">
            No secondary mailboxes connected
          </div>
        )}

        {activeTab === "dialer" && (
          <div className="text-center py-8 space-y-3">
            <Phone className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500">
              Dialer requires a telephony provider (e.g. Twilio) that isn&apos;t connected yet
            </p>
          </div>
        )}
      </div>

      {/* Campaign membership */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Campaign membership</h2>
        {activeCampaigns.length > 0 ? (
          <div className="space-y-2">
            {activeCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm text-gray-900">{c.name}</span>
                <span className="text-xs text-gray-500 capitalize">{c.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-gray-500">No active or paused campaigns</p>
          </div>
        )}
        <Link
          href="/campaigns"
          className="text-sm font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
        >
          View all campaigns
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Modals */}
      {showMailboxModal && <ConnectMailboxModal onClose={() => setShowMailboxModal(false)} />}
      {showPasswordModal && (
        <ChangePasswordModal user={user} onClose={() => setShowPasswordModal(false)} />
      )}
      {show2FAModal && (
        <TwoFactorModal
          user={user}
          onClose={() => setShow2FAModal(false)}
          onEnable={() => {}}
        />
      )}
      {showSignatureEditor && (
        <SignatureEditor
          onClose={() => setShowSignatureEditor(false)}
          onSaved={(s) => setSignature(s)}
        />
      )}
    </div>
  );
}
