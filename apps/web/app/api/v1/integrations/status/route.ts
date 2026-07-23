export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireUser();
    const integrations = await getUserIntegrations(user.id);

    const gmailRow = integrations.find((i) => i.type === "gmail");
    const gmailCfg = (gmailRow?.config ?? {}) as Record<string, unknown>;
    const gmailConnected = !!(
      gmailRow?.accessToken &&
      gmailRow?.accountEmail &&
      gmailCfg.connection_type === "smtp"
    );

    const crmConnected = integrations.some(
      (i) => (i.type === "hubspot" || i.type === "salesforce") && i.status === "active"
    );

    const hasCalendar = integrations.some(
      (i) => i.type === "google_calendar" && i.accessToken
    );

    const hasSlack = integrations.some(
      (i) => i.type === "slack" && i.status === "active"
    );

    let hasDnc = false;
    try {
      const dncResult = await db.execute(
        sql`SELECT EXISTS(SELECT 1 FROM agent_config WHERE user_id = ${user.id} AND category IN ('dnc_emails','dnc_domains','dnc_phones') LIMIT 1) AS has_dnc`
      );
      hasDnc = Boolean((dncResult as any).rows?.[0]?.has_dnc);
    } catch {}

    let hasCampaign = false;
    try {
      const campResult = await db.execute(
        sql`SELECT EXISTS(SELECT 1 FROM campaigns WHERE user_id = ${user.id} LIMIT 1) AS has_campaign`
      );
      hasCampaign = Boolean((campResult as any).rows?.[0]?.has_campaign);
    } catch {}

    let teamCount = 0;
    try {
      const teamResult = await db.execute(
        sql`SELECT COUNT(*)::int AS cnt FROM users WHERE organization_id = (SELECT organization_id FROM users WHERE id = ${user.id}) AND id != ${user.id}`
      );
      teamCount = Number((teamResult as any).rows?.[0]?.cnt ?? 0);
    } catch {}

    let hasVisitorTracking = false;
    try {
      const vtResult = await db.execute(
        sql`SELECT EXISTS(SELECT 1 FROM website_visitors WHERE user_id = ${user.id} LIMIT 1) AS has_vt`
      );
      hasVisitorTracking = Boolean((vtResult as any).rows?.[0]?.has_vt);
    } catch {}

    return NextResponse.json(
      {
        gmail: gmailConnected,
        crm: crmConnected,
        calendar: hasCalendar,
        slack: hasSlack,
        dnc: hasDnc,
        campaign: hasCampaign,
        teamCount,
        visitorTracking: hasVisitorTracking,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json({
      gmail: false, crm: false, calendar: false, slack: false,
      dnc: false, campaign: false, teamCount: 0, visitorTracking: false,
    }, { status: 200 });
  }
}
