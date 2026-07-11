export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamRoles } from "@aisdr/db/schema";
import { eq, asc } from "drizzle-orm";
import { ensureTeamSchema } from "../_lib";

// Same 8 keys as the frontend's `FeatureKey` type on the Access Controls page.
const FEATURE_KEYS = [
  "campaigns",
  "manageArya",
  "inboxTasks",
  "integrations",
  "userManagement",
  "accessTeam",
  "creditPurchasing",
  "billing",
] as const;

function normalizePermissions(
  input?: Record<string, boolean>
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    result[key] = input?.[key] === true;
  }
  return result;
}

// Matches the frontend's current `defaultToggles` values exactly.
const ADMIN_DEFAULTS = normalizePermissions({
  campaigns: true,
  manageArya: true,
  inboxTasks: true,
  integrations: true,
  userManagement: true,
  accessTeam: true,
  creditPurchasing: true,
  billing: true,
});

const MEMBER_DEFAULTS = normalizePermissions({
  campaigns: true,
  manageArya: true,
  inboxTasks: true,
  integrations: false,
  userManagement: false,
  accessTeam: false,
  creditPurchasing: false,
  billing: false,
});

const createRoleSchema = z.object({
  name: z.string().min(1),
  permissions: z.record(z.boolean()).optional(),
});

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTeamSchema();

    let rows = await db
      .select()
      .from(teamRoles)
      .where(eq(teamRoles.ownerUserId, user.id))
      .orderBy(asc(teamRoles.createdAt));

    if (rows.length === 0) {
      rows = await db
        .insert(teamRoles)
        .values([
          {
            ownerUserId: user.id,
            name: "Admin",
            isSystem: true,
            permissions: ADMIN_DEFAULTS,
          },
          {
            ownerUserId: user.id,
            name: "Member",
            isSystem: true,
            permissions: MEMBER_DEFAULTS,
          },
        ])
        .returning();
    }

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[team/roles:GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTeamSchema();

    const body = (await req.json()) as unknown;
    const parsed = createRoleSchema.parse(body);

    const [created] = await db
      .insert(teamRoles)
      .values({
        ownerUserId: user.id,
        name: parsed.name,
        isSystem: false,
        permissions: normalizePermissions(parsed.permissions),
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[team/roles:POST] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
