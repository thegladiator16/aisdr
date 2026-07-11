import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureUsersOnboardingColumns } from "@/lib/db/ensure-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, industry, targetMarket, companySize, role, tone, channels, dailyLimit } =
      body as {
        companyName?: string;
        industry?: string;
        targetMarket?: string;
        companySize?: string;
        role?: string;
        tone?: string;
        channels?: string[];
        dailyLimit?: number;
      };

    await ensureUsersOnboardingColumns();

    const result = await db
      .update(users)
      .set({
        ...(companyName !== undefined && { companyName }),
        ...(industry !== undefined && { industry }),
        ...(targetMarket !== undefined && { targetMarket }),
        ...(companySize !== undefined && { companySize }),
        ...(role !== undefined && { role }),
        ...(tone !== undefined && { outreachTone: tone }),
        ...(channels !== undefined && { outreachChannels: channels }),
        ...(dailyLimit !== undefined && { dailySendLimit: dailyLimit }),
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId))
      .returning({ id: users.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
