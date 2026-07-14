export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";

const connectSchema = z.object({
  calendarUrl: z.string().url().min(1),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = connectSchema.parse(body);

    const existing = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "google_calendar")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(integrations)
        .set({
          accessToken: parsed.calendarUrl,
          status: "active",
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing[0].id));
    } else {
      await db.insert(integrations).values({
        userId: user.id,
        type: "google_calendar",
        accessToken: parsed.calendarUrl,
        status: "active",
        config: { connection_type: "ical" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid calendar URL" }, { status: 400 });
    }
    console.error("[google-calendar] POST error:", error);
    return NextResponse.json({ error: "Failed to connect calendar" }, { status: 500 });
  }
}

export async function DELETE() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db
      .update(integrations)
      .set({
        accessToken: null,
        status: "disconnected",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "google_calendar")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[google-calendar] DELETE error:", error);
    return NextResponse.json({ error: "Failed to disconnect calendar" }, { status: 500 });
  }
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [row] = await db
      .select({
        id: integrations.id,
        accessToken: integrations.accessToken,
        status: integrations.status,
      })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "google_calendar")
        )
      )
      .limit(1);

    return NextResponse.json({
      connected: !!(row?.accessToken),
      status: row?.status ?? "disconnected",
    });
  } catch (error) {
    console.error("[google-calendar] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
