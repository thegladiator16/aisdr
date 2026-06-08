import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { replies, leads } from "@aisdr/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const conditions = [eq(replies.userId, user.id)];
    if (unreadOnly) conditions.push(eq(replies.isRead, false));

    const result = await db
      .select({
        reply: replies,
        lead: {
          id: leads.id,
          fullName: leads.fullName,
          companyName: leads.companyName,
          email: leads.email,
          jobTitle: leads.jobTitle,
        },
      })
      .from(replies)
      .leftJoin(leads, eq(replies.leadId, leads.id))
      .where(and(...conditions))
      .orderBy(desc(replies.receivedAt))
      .limit(limit);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
