"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { List, Plus, Search, Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

type ListItem = {
  id: string;
  name: string;
  description: string | null;
  leadCount: number;
  createdAt: string | null;
};

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* create modal */
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  /* delete confirmation */
  const [deleteTarget, setDeleteTarget] = useState<ListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lists");
      if (!res.ok) throw new Error("Failed to load lists");
      const json = await res.json();
      setLists(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load lists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  function openModal() {
    setShowModal(true);
    setName("");
    setDescription("");
    setCreateError("");
  }

  function closeModal() {
    setShowModal(false);
    setName("");
    setDescription("");
    setCreateError("");
  }

  async function handleCreate() {
    if (!name.trim()) {
      setCreateError("List name is required");
      return;
    }
    setSubmitting(true);
    setCreateError("");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create list");
      const json = await res.json();
      setLists((prev) => [json.data, ...prev]);
      toast.success("List created");
      closeModal();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create list"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lists/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete list");
      setLists((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast.success("List deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete list");
    } finally {
      setDeleting(false);
    }
  }

  const filteredLists = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lists</h1>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
        >
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

      {filteredLists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <List className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {lists.length === 0 ? "No lists yet" : "No lists match your search"}
          </p>
          {lists.length === 0 && (
            <>
              <p className="text-xs text-gray-400 mt-1">
                Create a list to organize and segment your leads.
              </p>
              <button
                onClick={openModal}
                className="mt-4 flex items-center gap-2 rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first list
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map((l) => (
            <div
              key={l.id}
              onClick={() => router.push(`/lists/${l.id}`)}
              className="relative rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-1">
                  {l.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(l);
                  }}
                  className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete list"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                {l.description || "No description"}
              </p>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-900">
                  {l.leadCount} lead{l.leadCount === 1 ? "" : "s"}
                </span>
                <span className="text-xs text-gray-400">
                  {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete list?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              &ldquo;{deleteTarget.name}&rdquo; will be permanently deleted. The
              leads in it won&apos;t be deleted.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CREATE LIST MODAL ========== */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New list</h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setCreateError("");
                  }}
                  className={`w-full rounded-lg border h-11 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none transition ${
                    createError ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder="e.g. Q3 target accounts"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submitting) handleCreate();
                  }}
                />
                {createError && (
                  <p className="mt-1.5 text-xs text-red-600">{createError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6C47FF] focus:ring-1 focus:ring-[#6C47FF] focus:outline-none transition resize-none"
                  placeholder="What is this list for?"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !name.trim()}
                className="rounded-lg bg-[#6C47FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a39dd] transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
