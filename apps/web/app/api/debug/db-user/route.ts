import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic: does the current Clerk session's user exist in our DB?
 * Reports whether the Clerk-webhook path (or the getCurrentUser fallback)
 * has ever succeeded in provisioning this user.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { userId: clerkId, sessionId } = auth();
    if (!clerkId) {
      return NextResponse.json({
        clerkAuth: { userId: null, sessionId: null },
        dbUser: null,
        subscription: null,
        note: "Clerk auth() sees no session — check /api/debug/auth-state",
      });
    }

    const [dbUser] = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        fullName: users.fullName,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    let sub = null;
    if (dbUser) {
      const [row] = await db
        .select({
          id: subscriptions.id,
          tier: subscriptions.tier,
          status: subscriptions.status,
          leadsLimit: subscriptions.leadsLimit,
          leadsUsed: subscriptions.leadsUsed,
          trialEndsAt: subscriptions.trialEndsAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.userId, dbUser.id))
        .limit(1);
      sub = row ?? null;
    }

    return NextResponse.json({
      clerkAuth: { userId: clerkId, sessionId },
      dbUser: dbUser ?? null,
      subscription: sub,
      webhookLikelyWorking: !!dbUser,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
