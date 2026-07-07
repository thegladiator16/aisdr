import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;
const TRIAL_DAYS = 14;
const TRIAL_LEADS_LIMIT = 10000;

export async function GET() {
  try {
    const { userId: clerkId, sessionClaims } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user by clerkId. If the Clerk webhook hasn't fired yet, create
    // the user eagerly using the email from the session claims or by calling
    // clerkClient.users.getUser(userId).
    let user = (
      await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
    )[0];

    if (!user) {
      let email = (sessionClaims?.email as string | undefined) ?? undefined;
      let fullName =
        (sessionClaims?.name as string | undefined) ?? undefined;

      if (!email) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          email =
            clerkUser.emailAddresses.find(
              (e) => e.id === clerkUser.primaryEmailAddressId
            )?.emailAddress ??
            clerkUser.emailAddresses[0]?.emailAddress ??
            undefined;
          const first = clerkUser.firstName ?? "";
          const last = clerkUser.lastName ?? "";
          fullName = fullName ?? (`${first} ${last}`.trim() || undefined);
        } catch (err) {
          console.error("clerkClient.users.getUser failed:", err);
        }
      }

      if (!email) {
        email = `${clerkId}@placeholder.com`;
      }

      const inserted = await db
        .insert(users)
        .values({
          clerkId,
          email,
          fullName,
        })
        .returning();
      user = inserted[0];
    }

    // Find the subscription. If none exists yet (e.g. webhook hasn't fired),
    // lazily create a trial subscription.
    let subscription = (
      await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .limit(1)
    )[0];

    if (!subscription) {
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * DAY);
      const inserted = await db
        .insert(subscriptions)
        .values({
          userId: user.id,
          tier: "trial",
          status: "active",
          trialEndsAt,
          leadsLimit: TRIAL_LEADS_LIMIT,
        })
        .returning();
      subscription = inserted[0];
    }

    const now = Date.now();
    const trialEndsAt = subscription.trialEndsAt ?? null;
    const daysLeft = trialEndsAt
      ? Math.max(0, Math.floor((trialEndsAt.getTime() - now) / DAY))
      : null;
    const isTrialing =
      subscription.tier === "trial" && (daysLeft ?? 0) > 0;

    return NextResponse.json({
      tier: subscription.tier,
      status: subscription.status,
      credits: subscription.leadsLimit,
      creditsUsed: subscription.leadsUsed ?? 0,
      trialEndsAt,
      daysLeft,
      isTrialing,
    });
  } catch (error) {
    console.error("GET /api/user/subscription error:", error);
    return NextResponse.json(
      { error: "Failed to load subscription" },
      { status: 500 }
    );
  }
}
