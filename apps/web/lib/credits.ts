import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, creditsUsage } from "@/lib/db/schema";

/**
 * Consume credits for a user action. Increments `subscriptions.leads_used`
 * atomically and logs one audit row to `credits_usage`. Never throws — a
 * credit-log failure must not break the underlying user action, so both
 * writes are wrapped in try/catch that logs and swallows.
 *
 * NOTE: `leadsUsed` is the DB column name kept for backwards compatibility;
 * the API surfaces it as `creditsUsed` everywhere (see
 * app/api/user/subscription/route.ts's field mapping).
 */
export async function consumeCredits(params: {
  userId: string;
  amount: number;
  action: string;
  campaignId?: string;
}): Promise<void> {
  const { userId, amount, action, campaignId } = params;
  if (amount <= 0) return;

  try {
    await db
      .update(subscriptions)
      .set({
        leadsUsed: sql`coalesce(${subscriptions.leadsUsed}, 0) + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  } catch (err) {
    console.error("[consumeCredits] failed to increment leadsUsed:", err);
  }

  try {
    await db.insert(creditsUsage).values({
      userId,
      action,
      creditsUsed: amount,
      campaignId: campaignId ?? null,
    });
  } catch (err) {
    console.error("[consumeCredits] failed to log credits_usage row:", err);
  }
}
