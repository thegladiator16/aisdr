export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ensureUsersOnboardingColumns } from "@/lib/db/ensure-schema";

const patchSchema = z.object({
  personalCity: z.string().max(200).optional(),
  previousCompanies: z.string().optional(),
  previousSchools: z.string().optional(),
  companyName: z.string().max(500).optional(),
  companyWebsite: z.string().max(500).optional(),
  industry: z.string().max(200).optional(),
  companyDomains: z.array(z.string()).optional(),
});

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUsersOnboardingColumns();

  const [user] = await db
    .select({
      id: users.id,
      personalCity: users.personalCity,
      previousCompanies: users.previousCompanies,
      previousSchools: users.previousSchools,
      companyName: users.companyName,
      companyWebsite: users.companyWebsite,
      industry: users.industry,
      companyDomains: users.companyDomains,
    })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return NextResponse.json({
    id: user?.id ?? null,
    personalCity: user?.personalCity ?? "",
    previousCompanies: user?.previousCompanies ?? "",
    previousSchools: user?.previousSchools ?? "",
    companyName: user?.companyName ?? "",
    companyWebsite: user?.companyWebsite ?? "",
    industry: user?.industry ?? "",
    companyDomains: user?.companyDomains ?? [],
  });
}

export async function PATCH(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  await ensureUsersOnboardingColumns();

  const result = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.clerkId, userId))
    .returning({ id: users.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
