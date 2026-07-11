export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, payments } from "@/lib/db/schema";

export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (!user) {
    return NextResponse.json({ transactions: [] });
  }

  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      description: payments.description,
      providerPaymentId: payments.providerPaymentId,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.createdAt))
    .limit(100);

  return NextResponse.json({ transactions: rows });
}
