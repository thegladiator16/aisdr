import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureCampaignsColumns } from "@/lib/db/ensure-schema";
import { ensureCampaignsApprovalColumn } from "@/app/api/campaigns/approval-mode/_lib";

async function getCampaignOrFail(userId: string, id: string) {
  await ensureCampaignsColumns();
  await ensureCampaignsApprovalColumn();
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
    await ensureCampaignsColumns();
    await ensureCampaignsApprovalColumn();
    const body = (await req.json()) as {
      action?: string;
      requireApproval?: boolean;
    };
    const { action, requireApproval } = body;

    // Bare `requireApproval` toggle — no action needed. Persist and return.
    if (action === undefined && typeof requireApproval === "boolean") {
      const result = await db
        .update(campaigns)
        .set({ requireApproval, updatedAt: new Date() })
        .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
        .returning();
      if (!result[0]) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(result[0]);
    }

    const statusMap: Record<string, { status: string; field: string }> = {
      start: { status: "active", field: "startedAt" },
      pause: { status: "paused", field: "pausedAt" },
      complete: { status: "completed", field: "completedAt" },
      archive: { status: "archived", field: "updatedAt" },
    };

    if (!action || !statusMap[action]) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const update = statusMap[action];

    const result = await db
      .update(campaigns)
      .set({
        status: update.status,
        [update.field]: new Date(),
        ...(typeof requireApproval === "boolean" ? { requireApproval } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, params.id), eq(campaigns.userId, user.id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
