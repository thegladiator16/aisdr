export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, users } from "@aisdr/db/schema";
import { eq } from "drizzle-orm";
import { ensureTeamSchema } from "../../_lib";

// Intentionally public — an invited person hasn't signed in yet the first
// time they land on this link, so this GET must not gate on requireUser().
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await ensureTeamSchema();

    const rows = await db
      .select({
        id: teamMembers.id,
        email: teamMembers.email,
        roleName: teamMembers.roleName,
        status: teamMembers.status,
        ownerCompanyName: users.companyName,
        ownerEmail: users.email,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.ownerUserId, users.id))
      .where(eq(teamMembers.inviteToken, params.token))
      .limit(1);

    const invite = rows[0];
    if (!invite || invite.status !== "invited") {
      return NextResponse.json(
        { error: "This invite link is invalid or has already been used" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        email: invite.email,
        roleName: invite.roleName,
        status: invite.status,
        ownerCompanyName: invite.ownerCompanyName || invite.ownerEmail,
      },
    });
  } catch (err) {
    // Public endpoint: an unknown/invalid token OR a not-yet-materialized
    // team_members table must present as 404, never as a server crash.
    // 42P01 = undefined_table, 42703 = undefined_column.
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : undefined;
    if (code === "42P01" || code === "42703") {
      return NextResponse.json(
        { error: "This invite link is invalid or has already been used" },
        { status: 404 }
      );
    }
    console.error("[team/invite/[token]:GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Accepting an invite DOES require auth — the visitor must sign in or sign
// up first (see app/invite/[token]/page.tsx), then this verifies their
// signed-in email matches the invited email before activating the row.
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const acceptingUser = await requireUser().catch(() => null);
  if (!acceptingUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTeamSchema();

    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.inviteToken, params.token))
      .limit(1);

    const invite = rows[0];
    if (!invite || invite.status !== "invited") {
      return NextResponse.json(
        { error: "This invite is no longer valid" },
        { status: 404 }
      );
    }

    if (invite.email.toLowerCase() !== acceptingUser.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This invite was sent to a different email address. Sign in with ${invite.email} to accept it.`,
        },
        { status: 403 }
      );
    }

    const [updated] = await db
      .update(teamMembers)
      .set({
        status: "active",
        joinedAt: new Date(),
        acceptedByUserId: acceptingUser.id,
      })
      .where(eq(teamMembers.id, invite.id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[team/invite/[token]:POST] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
