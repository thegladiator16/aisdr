"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn, STATUS_COLOR } from "@/lib/utils";

type MemberLead = {
  id: string;
  fullName: string | null;
  email: string | null;
  companyName: string | null;
  jobTitle: string | null;
  status: string | null;
};

type ListDetail = {
  id: string;
  name: string;
  description: string | null;
  leadCount: number;
  createdAt: string | null;
  leads: MemberLead[];
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

export default function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${params.id}`);
      if (!res.ok) {
        throw new Error(
          res.status === 404 ? "List not found" : "Failed to load list"
        );
      }
      const json = await res.json();
      setList(json.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load list";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function handleRemove(leadId: string) {
    setRemovingId(leadId);
    try {
      const res = await fetch(`/api/lists/${params.id}/leads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error("Failed to remove lead");
      setList((prev) =>
        prev
          ? {
              ...prev,
              leads: prev.leads.filter((l) => l.id !== leadId),
              leadCount: Math.max(0, prev.leadCount - 1),
            }
          : prev
      );
      toast.success("Lead removed from list");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove lead"
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/lists")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to lists
        </button>
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          {error ?? "List not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push("/lists")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to lists
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
            {list.description && (
              <p className="text-sm text-gray-500 mt-1">{list.description}</p>
            )}
          </div>
          <span className="text-sm font-medium text-gray-500">
            {list.leadCount} lead{list.leadCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-[#FAFAFA]">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Company
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Title
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-400">
                  No leads in this list yet.
                </td>
              </tr>
            ) : (
              list.leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-violet-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {lead.fullName ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.companyName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.jobTitle ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        STATUS_COLOR[lead.status ?? "new"] ??
                          "text-zinc-500 bg-zinc-100"
                      )}
                    >
                      {formatStatus(lead.status ?? "new")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(lead.id)}
                      disabled={removingId === lead.id}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Remove from list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
