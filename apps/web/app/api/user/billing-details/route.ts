export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

let ensured = false;
async function ensureBillingColumns() {
  if (ensured) return;
  try {
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_name VARCHAR(500),
      ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255)
    `);
    ensured = true;
  } catch {
    ensured = true;
  }
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureBillingColumns();
    const rows = await db.execute(
      sql`SELECT billing_name, billing_email, company_name, email FROM users WHERE id = ${user.id}::uuid LIMIT 1`
    );
    const row = ((rows as any).rows?.[0] ?? {}) as Record<string, string | null>;
    return NextResponse.json({
      billingName: row.billing_name || row.company_name || "My organization",
      billingEmail: row.billing_email || row.email || "",
    });
  } catch (error) {
    console.error("[billing-details] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const putSchema = z.object({
  billingName: z.string().max(500),
  billingEmail: z.string().email().max(255),
});

export async function PUT(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = putSchema.parse(body);

    await ensureBillingColumns();

    await db.execute(sql`
      UPDATE users
      SET billing_name = ${parsed.billingName},
          billing_email = ${parsed.billingEmail},
          updated_at = now()
      WHERE id = ${user.id}::uuid
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[billing-details] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
