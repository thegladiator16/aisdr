import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";

const createLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  industry: z.string().optional(),
  fundingStage: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  jobTitle: z.string().optional(),
  seniority: z.string().optional(),
  source: z.string().default("manual"),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const conditions = [eq(leads.userId, user.id)];
    if (status) conditions.push(eq(leads.status, status));
    if (search) {
      conditions.push(
        or(
          like(leads.fullName, `%${search}%`),
          like(leads.email, `%${search}%`),
          like(leads.companyName, `%${search}%`)
        )!
      );
    }

    const result = await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.score), desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(...conditions));

    return NextResponse.json({
      data: result,
      total: Number(totalResult[0]?.count ?? 0),
      limit,
      offset,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json() as unknown;
    const parsed = createLeadSchema.parse(body);

    const fullName =
      parsed.fullName ??
      ([parsed.firstName, parsed.lastName].filter(Boolean).join(" ") || undefined);

    const result = await db
      .insert(leads)
      .values({ ...parsed, fullName, userId: user.id })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
