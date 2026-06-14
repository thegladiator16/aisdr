"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  AlertTriangle,
  Pencil,
  Mail,
  Phone,
  ExternalLink,
  X,
} from "lucide-react";

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
    setConnecting(true);
    setTimeout(() => {
      toast.success("Mailbox connected successfully!");
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
/*  2FA Modal                                                          */
/* ------------------------------------------------------------------ */
function TwoFactorModal({
  onClose,
  onEnable,
}: {
  onClose: () => void;
  onEnable: () => void;
}) {
  const [code, setCode] = useState("");

  const handleVerify = () => {
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    toast.success("2FA enabled successfully");
    onEnable();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          {/* QR Code placeholder */}
          <div className="flex justify-center">
            <div className="h-[150px] w-[150px] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
              <span className="text-sm font-medium text-gray-400">QR Code</span>
            </div>
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
              className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors"
            >
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
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onChange(draft.trim());
    setEditing(false);
    if (draft.trim()) toast.success(`${label} updated`);
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
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#6C47FF] rounded-lg hover:bg-[#5a3ad4]"
          >
            Save
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
  const [activeTab, setActiveTab] = useState<"primary" | "secondary" | "dialer">("primary");

  /* Profile fields */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fullName, setFullName] = useState("Shashank Kumar");
  const [role] = useState("Owner");

  /* Personalization context */
  const [city, setCity] = useState("");
  const [companies, setCompanies] = useState("");
  const [schools, setSchools] = useState("");

  /* Security */
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  /* Mailbox modal */
  const [showMailboxModal, setShowMailboxModal] = useState(false);

  /* Avatar change handler */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      toast.success("Profile photo updated");
    }
  };

  /* Name save handler */
  const handleNameBlur = () => {
    if (fullName.trim()) {
      toast.success("Profile updated");
    }
  };

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

      {/* Profile section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="h-14 w-14 bg-violet-100 text-violet-700 font-bold text-lg rounded-full flex items-center justify-center">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
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
                className="w-full px-3 py-2 bg-white text-sm text-gray-700 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select
                value={role}
                disabled
                className="w-full px-3 py-2 bg-gray-100 text-sm text-gray-700 rounded-lg border border-gray-200 cursor-not-allowed"
              >
                <option>Owner</option>
                <option>Admin</option>
                <option>Member</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Context for personalizations */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Context for personalizations</h2>
        <div className="space-y-3">
          <EditableField label="City you live in" addLabel="+ Add city" value={city} onChange={setCity} />
          <div className="border-t border-gray-100">
            <EditableField label="Previous companies" addLabel="+ Add companies" value={companies} onChange={setCompanies} />
          </div>
          <div className="border-t border-gray-100">
            <EditableField label="Previous schools" addLabel="+ Add schools" value={schools} onChange={setSchools} />
          </div>
        </div>
      </div>

      {/* Account security */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Account security</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Reset password</p>
              <p className="text-xs text-gray-500">Send a password reset link to your email</p>
            </div>
            <button
              onClick={() => toast.success("Password reset email sent to your email")}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Two Factor Authentication (2FA)</p>
              {twoFAEnabled ? (
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
                if (!twoFAEnabled) setShow2FAModal(true);
              }}
              disabled={twoFAEnabled}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                twoFAEnabled
                  ? "text-green-700 border border-green-300 bg-green-50 cursor-default"
                  : "text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {twoFAEnabled ? "Enabled" : "Enable"}
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
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
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

        {activeTab === "primary" && (
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
        )}

        {activeTab === "secondary" && (
          <div className="text-center py-8 text-sm text-gray-500">
            No secondary mailboxes connected
          </div>
        )}

        {activeTab === "dialer" && (
          <div className="text-center py-8 space-y-3">
            <Phone className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500">Dialer not configured</p>
          </div>
        )}
      </div>

      {/* Campaign membership */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Campaign membership</h2>
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-gray-500">No active or paused campaigns</p>
          <Link
            href="/campaigns"
            className="text-sm font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
          >
            View all campaigns
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Modals */}
      {showMailboxModal && <ConnectMailboxModal onClose={() => setShowMailboxModal(false)} />}
      {show2FAModal && (
        <TwoFactorModal
          onClose={() => setShow2FAModal(false)}
          onEnable={() => setTwoFAEnabled(true)}
        />
      )}
    </div>
  );
}
