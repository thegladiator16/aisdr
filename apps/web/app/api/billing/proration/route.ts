export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db";
import {
  getPlanAmount,
  type SupportedCurrency,
} from "@/lib/payments/razorpay";

type PlanKey = "starter" | "growth" | "scale";
type Billing = "monthly" | "yearly";

const VALID_PLANS = new Set<PlanKey>(["starter", "growth", "scale"]);

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { chargeToday: null, error: "Unauthorized" },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const toPlan = body?.toPlan as PlanKey | undefined;
    const billing: Billing = body?.billing === "yearly" ? "yearly" : "monthly";
    const currency: SupportedCurrency =
      String(body?.currency ?? "").toUpperCase() === "USD" ? "USD" : "INR";

    if (!toPlan || !VALID_PLANS.has(toPlan)) {
      return NextResponse.json(
        { chargeToday: null, error: "Invalid plan" },
        { status: 200 }
      );
    }

    const userRow = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!userRow) {
      return NextResponse.json(
        { chargeToday: null, error: "User not found" },
        { status: 200 }
      );
    }

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userRow.id),
    });

    const currentTier = (sub?.tier ?? "free") as string;
    const periodDays = billing === "yearly" ? 365 : 30;

    let daysRemaining: number;
    if (sub?.currentPeriodEnd) {
      const msLeft = new Date(sub.currentPeriodEnd).getTime() - Date.now();
      const raw = Math.ceil(msLeft / 86400000);
      daysRemaining = Math.max(0, Math.min(periodDays, raw));
    } else {
      // Trial / free user with no period end — treat as a full fresh period.
      daysRemaining = periodDays;
    }

    // Prices in smallest currency units (paise / cents) from razorpay.ts.
    // Convert to major units for the client display.
    const currentPriceMinor =
      VALID_PLANS.has(currentTier as PlanKey)
        ? getPlanAmount(currentTier, billing, currency) ?? 0
        : 0;
    const newPriceMinor = getPlanAmount(toPlan, billing, currency) ?? 0;

    const currentPrice = currentPriceMinor / 100;
    const newPrice = newPriceMinor / 100;

    const unusedCredit = Math.round((currentPrice * daysRemaining) / periodDays);
    const newProrated = Math.round((newPrice * daysRemaining) / periodDays);
    const chargeToday = Math.max(0, newProrated - unusedCredit);

    const now = new Date();
    const newPeriodEnd = new Date(now.getTime() + periodDays * 86400000);

    return NextResponse.json({
      chargeToday,
      unusedCredit,
      newPeriodStart: now.toISOString(),
      newPeriodEnd: newPeriodEnd.toISOString(),
      daysRemaining,
      currency,
    });
  } catch (err) {
    return NextResponse.json(
      {
        chargeToday: null,
        error: err instanceof Error ? err.message : "Proration failed",
      },
      { status: 200 }
    );
  }
}
