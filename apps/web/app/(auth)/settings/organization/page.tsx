"use client";

import { Pencil, Plus } from "lucide-react";

export default function OrganizationPage() {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your organization settings and details
        </p>
      </div>

      {/* Organization name */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500">
              Organization name
            </h2>
            <p className="text-base font-semibold text-gray-900 mt-1">
              AryaSDR&apos;s organization
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>

      {/* Domain */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Domain</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center flex-1">
            <span className="px-3 py-2 bg-gray-100 text-sm text-gray-500 border border-r-0 border-gray-200 rounded-l-lg">
              https://
            </span>
            <input
              type="text"
              placeholder="example.com"
              className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Organization ID */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-1">
          Organization ID
        </h2>
        <p className="text-sm text-gray-700 font-mono">
          f47ac10b-58cc-4372-a567-0e02b2c3d479
        </p>
      </div>
    </div>
  );
}
