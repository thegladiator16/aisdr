import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, industry, targetMarket, role } = body as {
      companyName?: string;
      industry?: string;
      targetMarket?: string;
      companySize?: string;
      role?: string;
      tone?: string;
      channels?: string[];
      dailyLimit?: number;
    };

    await db
      .update(users)
      .set({
        ...(companyName !== undefined && { companyName }),
        ...(industry !== undefined && { industry }),
        ...(targetMarket !== undefined && { targetMarket }),
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
