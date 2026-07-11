export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { trackedDomains } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureWebsiteVisitorsSchema } from "@/lib/db/ensure-schema";

const createSchema = z.object({
  domain: z
    .string()
    .min(3)
    .transform((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")),
  identifyPeople: z.boolean().optional(),
  identifyCompanies: z.boolean().optional(),
  budgetEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    await ensureWebsiteVisitorsSchema();

    const rows = await db
      .select()
      .from(trackedDomains)
      .where(eq(trackedDomains.userId, user.id))
      .orderBy(desc(trackedDomains.createdAt));

    return NextResponse.json({ domains: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await ensureWebsiteVisitorsSchema();

    const body = (await req.json()) as unknown;
    const parsed = createSchema.parse(body);

    const verificationToken = crypto.randomBytes(16).toString("hex");

    const [created] = await db
      .insert(trackedDomains)
      .values({
        userId: user.id,
        domain: parsed.domain,
        identifyPeople: parsed.identifyPeople ?? true,
        identifyCompanies: parsed.identifyCompanies ?? true,
        budgetEnabled: parsed.budgetEnabled ?? false,
        verificationToken,
      })
      .returning();

    return NextResponse.json({ domain: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[website-visitors/domains:POST] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
