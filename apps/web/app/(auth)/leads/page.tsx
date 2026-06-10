import { requireUser } from "@/lib/auth";
import { getLeads } from "@/lib/db/queries";
import Link from "next/link";
import { Plus, Upload, Search } from "lucide-react";
import { cn, STATUS_COLOR } from "@/lib/utils";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string; page?: string };
}) {
  const user = await requireUser();
  const page = parseInt(searchParams.page ?? "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data: leads, total } = await (async () => {
    const res = await getLeads(user.id, {
      status: searchParams.status,
      search: searchParams.search,
      limit,
      offset,
    });
    return { data: res, total: res.length };
  })();

  const statuses = [
    "new", "researching", "ready", "in_sequence",
    "replied", "meeting_booked", "not_interested",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads/import"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Link>
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/leads"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            !searchParams.status
              ? "bg-primary text-white"
              : "border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/leads?status=${s}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
              searchParams.status === s
                ? "bg-primary text-white"
                : "border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Company</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  No leads yet.{" "}
                  <Link href="/leads/import" className="text-primary hover:underline">
                    Import a CSV
                  </Link>{" "}
                  to get started.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {lead.fullName ?? (`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "—")}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {lead.country ?? lead.location}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {lead.companyName ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground truncate max-w-[180px]">
                    {lead.jobTitle ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {lead.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_COLOR[lead.status ?? "new"] ?? "text-zinc-400 bg-zinc-400/10"
                      )}
                    >
                      {(lead.status ?? "new").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.score != null ? (
                      <span
                        className={cn(
                          "font-mono text-xs font-bold",
                          lead.score >= 70
                            ? "text-green-400"
                            : lead.score >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                        )}
                      >
                        {lead.score}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
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
