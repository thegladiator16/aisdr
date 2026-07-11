export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, users } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureTeamSchema } from "../_lib";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aryasdr.in";

const createMemberSchema = z.object({
  email: z.string().email(),
  roleName: z.string().min(1),
  addAsSender: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTeamSchema();

    const rows = await db
      .select({
        id: teamMembers.id,
        email: teamMembers.email,
        roleName: teamMembers.roleName,
        status: teamMembers.status,
        inviteToken: teamMembers.inviteToken,
        addAsSender: teamMembers.addAsSender,
        invitedAt: teamMembers.invitedAt,
        joinedAt: teamMembers.joinedAt,
        acceptedByUserId: teamMembers.acceptedByUserId,
        acceptedByName: users.fullName,
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.acceptedByUserId, users.id))
      .where(eq(teamMembers.ownerUserId, user.id))
      .orderBy(desc(teamMembers.invitedAt));

    const data = rows.map((row) => ({
      ...row,
      inviteLink: row.inviteToken ? `${APP_URL}/invite/${row.inviteToken}` : null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[team/members:GET] error:", err);
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
    const parsed = createMemberSchema.parse(body);

    const inviteToken = crypto.randomBytes(24).toString("hex");

    const [created] = await db
      .insert(teamMembers)
      .values({
        ownerUserId: user.id,
        email: parsed.email.toLowerCase(),
        roleName: parsed.roleName,
        status: "invited",
        inviteToken,
        addAsSender: parsed.addAsSender ?? true,
      })
      .returning();

    return NextResponse.json(
      {
        data: created,
        inviteLink: `${APP_URL}/invite/${inviteToken}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[team/members:POST] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
