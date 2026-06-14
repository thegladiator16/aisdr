"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Pencil,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<
    "primary" | "secondary" | "dialer"
  >("primary");

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
            <p className="text-sm font-bold text-amber-800">
              Issues you can fix
            </p>
            <p className="text-sm text-amber-700">
              Your primary mailbox is not connected
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors">
          Connect mailbox
        </button>
      </div>

      {/* Profile section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 bg-violet-100 text-violet-700 font-bold text-lg rounded-full flex items-center justify-center">
              A
            </div>
            <button className="absolute -bottom-1 -right-1 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50">
              <Pencil className="h-3 w-3 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Full name
              </label>
              <input
                type="text"
                value="Arya User"
                readOnly
                className="w-full px-3 py-2 bg-gray-100 text-sm text-gray-700 rounded-lg border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Role
              </label>
              <select className="w-full px-3 py-2 bg-white text-sm text-gray-700 rounded-lg border border-gray-200">
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
        <h2 className="text-base font-semibold text-gray-900">
          Context for personalizations
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">City you live in</span>
            <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              + Add city
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <span className="text-sm text-gray-700">Previous companies</span>
            <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              + Add companies
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <span className="text-sm text-gray-700">Previous schools</span>
            <button className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              + Add schools
            </button>
          </div>
        </div>
      </div>

      {/* Account security */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          Account security
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Reset password
              </p>
              <p className="text-xs text-gray-500">
                Send a password reset link to your email
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Reset
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Two Factor Authentication (2FA)
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                Not enabled
              </span>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Outreach channels */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          Outreach channels
        </h2>
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
            <h3 className="text-sm font-semibold text-gray-900">
              Connect mailbox
            </h3>
            <p className="text-sm text-gray-500">
              Your primary mailbox is not connected
            </p>
            <button className="px-4 py-2 bg-[#6C47FF] text-white text-sm font-medium rounded-lg hover:bg-[#5a3ad4] transition-colors">
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
            <p className="text-sm text-gray-500">
              Dialer not configured
            </p>
          </div>
        )}
      </div>

      {/* Campaign membership */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          Campaign membership
        </h2>
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-gray-500">
            No active or paused campaigns
          </p>
          <a
            href="/campaigns"
            className="text-sm font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
          >
            View all campaigns
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
