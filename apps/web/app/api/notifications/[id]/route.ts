export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@aisdr/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureNotificationsSchema } from "../_lib";

// Body is optional: if `readAt` is a string, mark read (server sets now());
// if `readAt` is null, clear the read state. Omitted body = mark read.
const patchSchema = z.object({
  readAt: z.union([z.string(), z.null()]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureNotificationsSchema();

    let parsed: z.infer<typeof patchSchema> = {};
    try {
      const raw = (await req.json()) as unknown;
      parsed = patchSchema.parse(raw);
    } catch {
      // Empty body / bad JSON — default to marking read.
      parsed = {};
    }

    const clearing = parsed.readAt === null;
    const newReadAt = clearing ? null : new Date();

    const updated = await db
      .update(notifications)
      .set({ readAt: newReadAt })
      .where(
        and(
          eq(notifications.id, params.id),
          eq(notifications.userId, user.id)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated[0] });
  } catch (err) {
    console.error("[notifications/[id]:PATCH] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
