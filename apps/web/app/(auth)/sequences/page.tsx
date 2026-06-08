import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sequences } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";
import { ListOrdered, Plus } from "lucide-react";
import Link from "next/link";
import type { SequenceStep } from "@aisdr/db/schema";

export default async function SequencesPage() {
  const user = await requireUser();
  const userSequences = await db
    .select()
    .from(sequences)
    .where(eq(sequences.userId, user.id))
    .orderBy(desc(sequences.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {userSequences.length} sequence{userSequences.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {userSequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">No sequences yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Sequences are created when you launch a campaign.
          </p>
          <Link
            href="/campaigns/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {userSequences.map((seq) => {
            const steps = seq.steps as SequenceStep[];
            return (
              <div key={seq.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{seq.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {steps.length} steps
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <div className="h-px w-4 bg-border" />}
                      <div className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                        Day {step.delayDays} · {step.channel.replace("_", " ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
