export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { encryptPassword } from "@/lib/integrations/gmail";

const connectSchema = z.object({
  accountSid: z.string().min(1, "Account SID is required"),
  authToken: z.string().min(1, "Auth Token is required"),
  phoneNumber: z.string().optional(),
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

    const encrypted = encryptPassword(parsed.authToken);

    const existing = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "twilio")
        )
      )
      .limit(1);

    const values = {
      accessToken: encrypted,
      accountEmail: parsed.accountSid,
      accountName: parsed.phoneNumber || null,
      status: "active" as const,
      error: null,
      config: {
        connection_type: "api_key",
        phone_number: parsed.phoneNumber ?? "",
      },
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(integrations)
        .set(values)
        .where(eq(integrations.id, existing[0].id));
    } else {
      await db.insert(integrations).values({
        userId: user.id,
        type: "twilio",
        ...values,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[twilio] POST error:", error);
    return NextResponse.json({ error: "Failed to connect Twilio" }, { status: 500 });
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
        accountEmail: null,
        accountName: null,
        status: "disconnected",
        config: {},
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "twilio")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[twilio] DELETE error:", error);
    return NextResponse.json({ error: "Failed to disconnect Twilio" }, { status: 500 });
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
        accountEmail: integrations.accountEmail,
        status: integrations.status,
        config: integrations.config,
      })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, user.id),
          eq(integrations.type, "twilio")
        )
      )
      .limit(1);

    return NextResponse.json({
      connected: !!(row?.accessToken),
      status: row?.status ?? "disconnected",
      accountSid: row?.accountEmail ?? null,
    });
  } catch (error) {
    console.error("[twilio] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
