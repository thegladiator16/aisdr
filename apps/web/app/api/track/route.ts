import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { identifyVisitor } from "@/lib/tracking/visitor-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    trackingId?: string;
    page?: string;
    referrer?: string;
    userAgent?: string;
    domain?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trackingId = body.trackingId?.trim();
  if (!trackingId) {
    return NextResponse.json(
      { error: "trackingId is required" },
      { status: 400 }
    );
  }

  try {
    const domainRow = await db.execute(sql`
      SELECT user_id, domain
      FROM tracked_domains
      WHERE verification_token = ${trackingId}
        AND verified = true
      LIMIT 1
    `);

    if (!(domainRow as any).rows?.length) {
      return NextResponse.json(
        { error: "Unknown or unverified tracking ID" },
        { status: 404 }
      );
    }

    const owner = (domainRow as any).rows[0] as { user_id: string; domain: string };

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const visitor = await identifyVisitor(ip, body.domain ?? null);

    await db.execute(sql`
      INSERT INTO website_visitors (user_id, domain, pages_viewed, source, sessions, company_name, industry, employee_count)
      VALUES (
        ${owner.user_id}::uuid,
        ${owner.domain},
        ${JSON.stringify([{ page: body.page ?? "/", referrer: body.referrer ?? "", ts: new Date().toISOString() }])}::jsonb,
        ${body.referrer ?? "direct"},
        1,
        ${visitor.company},
        ${visitor.industry},
        ${visitor.employeeCount}
      )
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[track] error:", error);
    return NextResponse.json(
      { error: "Failed to record visit" },
      { status: 500 }
    );
  }
}
