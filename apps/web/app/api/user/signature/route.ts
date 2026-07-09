export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function ensureColumn() {
  await db.execute(
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_signature text`
  );
}

export async function POST(req: Request) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { signature } = await req.json().catch(() => ({}));
  if (typeof signature !== "string") {
    return NextResponse.json({ error: "signature is required" }, { status: 400 });
  }

  await ensureColumn();

  await db
    .update(users)
    .set({ emailSignature: signature, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId));

  return NextResponse.json({ success: true });
}
