"use client";

import { useState } from "react";
import { List, Plus, Search, MoreHorizontal } from "lucide-react";

export default function ListsPage() {
  const [search, setSearch] = useState("");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lists</h1>
        <button className="flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors">
          <Plus className="h-4 w-4" />
          Create list
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lists..."
            className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-20">
        <List className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No lists yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Create a list to organize and segment your leads.
        </p>
        <button className="mt-4 flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors">
          <Plus className="h-4 w-4" />
          Create your first list
        </button>
      </div>
    </div>
  );
}
