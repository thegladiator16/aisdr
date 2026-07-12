export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationsConfig } from "@/lib/db/schema";

// The 4 notification rows on the Settings > Notifications page that have a
// real, buildable email toggle (backed by notifications_config.email_enabled).
// The other 5 rows on that page are honestly marked "coming soon" in the UI
// and have no backend — keep this list in sync with the frontend's non
// comingSoon row ids in app/(auth)/settings/notifications/page.tsx.
const NOTIFICATION_TYPES = ["urgent", "billing", "replies", "escalated"] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Matches the frontend's previous default-on behavior for these rows so a
// fresh account (zero rows in notifications_config) renders as all-enabled.
const DEFAULT_EMAIL_ENABLED: Record<NotificationType, boolean> = {
  urgent: true,
  billing: true,
  replies: true,
  escalated: true,
};

// Idempotent — this project applies schema changes via runtime guards rather
// than a migration step in `next build` (see the same pattern in
// lib/db/ensure-schema.ts and app/api/user/subscription/route.ts). The
// unique index lets PUT below safely select-then-insert/update without ever
// creating duplicate rows for the same (user, notificationType) pair.
let ensured = false;
async function ensureNotificationsSchema() {
  if (ensured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications_config (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(100) NOT NULL,
        email_enabled BOOLEAN DEFAULT true,
        slack_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_config_user_type ON notifications_config(user_id, notification_type)`
    );
    ensured = true;
  } catch (err) {
    console.error("[notifications] ensureNotificationsSchema failed:", err);
  }
}

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureNotificationsSchema();

    const rows = await db
      .select({
        notificationType: notificationsConfig.notificationType,
        emailEnabled: notificationsConfig.emailEnabled,
      })
      .from(notificationsConfig)
      .where(eq(notificationsConfig.userId, user.id));

    const byType = new Map(rows.map((r) => [r.notificationType, r.emailEnabled]));

    const data: Record<string, { emailEnabled: boolean }> = {};
    for (const type of NOTIFICATION_TYPES) {
      const stored = byType.get(type);
      data[type] = {
        emailEnabled: stored ?? DEFAULT_EMAIL_ENABLED[type],
      };
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[notifications] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const putSchema = z.object({
  notificationType: z.enum(NOTIFICATION_TYPES),
  emailEnabled: z.boolean(),
});

export async function PUT(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as unknown;
    const parsed = putSchema.parse(body);

    await ensureNotificationsSchema();

    const existing = (
      await db
        .select({ id: notificationsConfig.id })
        .from(notificationsConfig)
        .where(
          and(
            eq(notificationsConfig.userId, user.id),
            eq(notificationsConfig.notificationType, parsed.notificationType)
          )
        )
        .limit(1)
    )[0];

    if (existing) {
      await db
        .update(notificationsConfig)
        .set({ emailEnabled: parsed.emailEnabled })
        .where(eq(notificationsConfig.id, existing.id));
    } else {
      await db.insert(notificationsConfig).values({
        userId: user.id,
        notificationType: parsed.notificationType,
        emailEnabled: parsed.emailEnabled,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[notifications] PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
