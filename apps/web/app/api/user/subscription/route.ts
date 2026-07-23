import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { getPlanAmountInPaise } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;
const TRIAL_DAYS = 14;
const TRIAL_LEADS_LIMIT = 10000;
const FREE_PLAN_CREDITS = 10000;

// Idempotent — only runs the ALTER if the column is missing. Guards against
// schema drift between the app code and the production DB.
let ensured = false;
async function ensureColumnsExist() {
  if (ensured) return;
  try {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_signature text`
    );
    ensured = true;
  } catch (err) {
    console.error("[subscription] ensureColumnsExist failed:", err);
  }
}

export async function GET() {
  try {
    const { userId: clerkId, sessionClaims } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureColumnsExist();

    // Select only the columns we actually need — avoids `SELECT *` breaking
    // when the DB is missing newer schema columns.
    let user = (
      await db
        .select({
          id: users.id,
          clerkId: users.clerkId,
          email: users.email,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1)
    )[0];

    if (!user) {
      let email = (sessionClaims?.email as string | undefined) ?? undefined;
      let fullName = (sessionClaims?.name as string | undefined) ?? undefined;

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
          console.error("[subscription] clerkClient.users.getUser failed:", err);
        }
      }

      if (!email) {
        email = `${clerkId}@placeholder.com`;
      }

      const inserted = await db
        .insert(users)
        .values({ clerkId, email, fullName })
        .returning({
          id: users.id,
          clerkId: users.clerkId,
          email: users.email,
          fullName: users.fullName,
        });
      user = inserted[0]!;
    }

    let subscription = (
      await db
        .select({
          id: subscriptions.id,
          tier: subscriptions.tier,
          status: subscriptions.status,
          leadsLimit: subscriptions.leadsLimit,
          leadsUsed: subscriptions.leadsUsed,
          trialEndsAt: subscriptions.trialEndsAt,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
        })
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
        .returning({
          id: subscriptions.id,
          tier: subscriptions.tier,
          status: subscriptions.status,
          leadsLimit: subscriptions.leadsLimit,
          leadsUsed: subscriptions.leadsUsed,
          trialEndsAt: subscriptions.trialEndsAt,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
        });
      subscription = inserted[0]!;
    }

    // Self-heal: users who signed up before the credit-limit fix are stuck
    // on old caps (50/100/300/500/1000). Bump them to the current
    // trial/free allotment on next load so nobody has to run raw SQL.
    if (
      (subscription.tier === "trial" || subscription.tier === "free") &&
      (subscription.leadsLimit ?? 0) < TRIAL_LEADS_LIMIT
    ) {
      try {
        await db
          .update(subscriptions)
          .set({ leadsLimit: TRIAL_LEADS_LIMIT, leadsUsed: 0 })
          .where(eq(subscriptions.id, subscription.id));
        subscription = {
          ...subscription,
          leadsLimit: TRIAL_LEADS_LIMIT,
          leadsUsed: 0,
        };
      } catch (err) {
        console.error("[subscription] credit self-heal failed:", err);
      }
    }

    const now = Date.now();
    const trialEndsAt = subscription.trialEndsAt ?? null;
    const daysLeft = trialEndsAt
      ? Math.max(0, Math.floor((trialEndsAt.getTime() - now) / DAY))
      : null;
    const trialExpired = subscription.tier === "trial" && (daysLeft ?? 0) <= 0;

    // Auto-downgrade expired trials to the free plan.
    // All campaigns are paused by the campaign runner when credits reach 0;
    // the tier change here stops new enrollments from being allowed.
    if (trialExpired) {
      try {
        await db
          .update(subscriptions)
          .set({
            tier: "free",
            status: "active",
            leadsLimit: FREE_PLAN_CREDITS,
            leadsUsed: 0,
          })
          .where(eq(subscriptions.userId, user.id));
        subscription = { ...subscription, tier: "free", leadsLimit: FREE_PLAN_CREDITS, leadsUsed: 0 };
      } catch (err) {
        console.error("[subscription] trial-to-free downgrade failed:", err);
      }
    }

    const isTrialing =
      subscription.tier === "trial" && (daysLeft ?? 0) > 0;

    const monthlyCostPaise =
      subscription.tier === "starter" ||
      subscription.tier === "growth" ||
      subscription.tier === "scale"
        ? getPlanAmountInPaise(subscription.tier, "monthly") ?? 0
        : 0;

    return NextResponse.json(
      {
        tier: subscription.tier,
        status: subscription.status,
        credits: subscription.leadsLimit ?? 0,
        creditsUsed: subscription.leadsUsed ?? 0,
        trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd ?? null,
        monthlyCostPaise,
        daysLeft,
        isTrialing,
      },
      {
        headers: {
          // Per-user cache — safe because credit consumption is also
          // enforced server-side in the agent orchestrator. Sidebar and
          // trial banner remount on every navigation, so this stops the
          // DB from being hit for each of them.
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[subscription] GET error:", error);
    // Fall back to a safe trial-shaped response so the sidebar / trial banner
    // doesn't get stuck on the loading state for the active user.
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * DAY);
    return NextResponse.json({
      tier: "trial",
      status: "active",
      credits: TRIAL_LEADS_LIMIT,
      creditsUsed: 0,
      trialEndsAt,
      currentPeriodEnd: null,
      monthlyCostPaise: 0,
      daysLeft: TRIAL_DAYS,
      isTrialing: true,
      warning: "degraded",
    });
  }
}
