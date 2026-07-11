import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureCampaignsColumns } from "@/lib/db/ensure-schema";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureCampaignsColumns();

    const [source] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .limit(1);

    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Copy the campaign's configuration (targeting, sequence, sending
    // schedule) but reset identity/lifecycle/performance fields — a
    // "duplicate" should give you a fresh draft to tweak, not a clone that
    // inherits the source's stats or is already mid-send.
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      totalLeads: _totalLeads,
      emailsSent: _emailsSent,
      linkedinDmsSent: _linkedinDmsSent,
      whatsappsSent: _whatsappsSent,
      totalReplies: _totalReplies,
      positiveReplies: _positiveReplies,
      meetingsBooked: _meetingsBooked,
      bounces: _bounces,
      unsubscribes: _unsubscribes,
      totalMeetingsBooked: _totalMeetingsBooked,
      startedAt: _startedAt,
      pausedAt: _pausedAt,
      completedAt: _completedAt,
      ...rest
    } = source;

    const result = await db
      .insert(campaigns)
      .values({
        ...rest,
        name: `${source.name} (copy)`,
        status: "draft",
      })
      .returning();

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error("[campaigns:duplicate] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
