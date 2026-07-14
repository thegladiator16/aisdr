import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  isHubSpotConfigured,
  syncLeadToHubspot,
} from "@/lib/integrations/hubspot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isHubSpotConfigured()) {
    return NextResponse.json(
      { error: "HubSpot is not configured. Set HUBSPOT_API_KEY in your environment." },
      { status: 400 }
    );
  }

  try {
    // Fetch leads that haven't been synced to HubSpot yet (no source = 'hubspot')
    const leadsResult = await db.execute(sql`
      SELECT id, email, first_name, last_name, company_name, job_title, phone
      FROM leads
      WHERE user_id = ${user.id}::uuid
        AND email IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 100
    `);

    const leads = (leadsResult as any).rows ?? [];
    let synced = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const lead of leads) {
      const row = lead as {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        company_name: string | null;
        job_title: string | null;
        phone: string | null;
      };

      try {
        await syncLeadToHubspot({
          email: row.email,
          firstName: row.first_name ?? undefined,
          lastName: row.last_name ?? undefined,
          company: row.company_name ?? undefined,
          title: row.job_title ?? undefined,
          phone: row.phone ?? undefined,
        });
        synced++;
      } catch (err) {
        failed++;
        errors.push({
          email: row.email,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      totalProcessed: leads.length,
      synced,
      failed,
      errors: errors.slice(0, 10), // Cap error details to avoid huge responses
    });
  } catch (error) {
    console.error("[integrations/hubspot/sync] error:", error);
    return NextResponse.json(
      { error: "Failed to sync with HubSpot" },
      { status: 500 }
    );
  }
}
