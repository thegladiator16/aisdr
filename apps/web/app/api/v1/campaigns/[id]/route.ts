import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";

async function getCampaignOrFail(userId: string, id: string) {
  const result = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const campaign = await getCampaignOrFail(user.id, params.id);
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const campaign = await getCampaignOrFail(user.id, params.id);
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json() as Record<string, unknown>;
    const { id: _id, userId: _uid, createdAt: _ca, ...updateable } = body;

    const result = await db
      .update(campaigns)
      .set({ ...updateable, updatedAt: new Date() })
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json() as { action: string };
    const { action } = body;

    const statusMap: Record<string, { status: string; field: string }> = {
      start: { status: "active", field: "startedAt" },
      pause: { status: "paused", field: "pausedAt" },
      complete: { status: "completed", field: "completedAt" },
      archive: { status: "archived", field: "updatedAt" },
    };

    const update = statusMap[action];
    if (!update) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await db
      .update(campaigns)
      .set({
        status: update.status,
        [update.field]: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
