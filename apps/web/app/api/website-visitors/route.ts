export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { websiteVisitors, trackedDomains } from "@aisdr/db/schema";
import { eq, and, gte, lte, ilike, sql, desc, type SQL } from "drizzle-orm";
import { ensureWebsiteVisitorsSchema } from "@/lib/db/ensure-schema";

const WINDOW_MS: Record<string, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    await ensureWebsiteVisitorsSchema();

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");
    const source = searchParams.get("source");
    const medium = searchParams.get("medium");
    const campaign = searchParams.get("campaign");
    const qualified = searchParams.get("qualified"); // "qualified" | "unqualified" | null
    const titleFilter = searchParams.get("title");
    const seniority = searchParams.get("seniority");
    const department = searchParams.get("department");
    const location = searchParams.get("location");
    const emailFilter = searchParams.get("email");
    const hasPhone = searchParams.get("hasPhone") === "true";
    const repeatOnly = searchParams.get("repeatOnly") === "true";
    const lastSeen = searchParams.get("lastSeen");
    const firstSeen = searchParams.get("firstSeen");
    const sessionsMin = searchParams.get("sessionsMin");
    const sessionsMax = searchParams.get("sessionsMax");
    const pageviewsMin = searchParams.get("pageviewsMin");
    const pageviewsMax = searchParams.get("pageviewsMax");
    const keyPages = searchParams.get("keyPages");
    const search = searchParams.get("search");

    const conditions: SQL[] = [eq(websiteVisitors.userId, user.id)];
    if (domain) conditions.push(eq(websiteVisitors.domain, domain));
    if (source) conditions.push(ilike(websiteVisitors.source, `%${source}%`));
    if (medium) conditions.push(ilike(websiteVisitors.medium, `%${medium}%`));
    if (campaign) conditions.push(ilike(websiteVisitors.campaign, `%${campaign}%`));
    if (qualified === "qualified") conditions.push(eq(websiteVisitors.qualified, true));
    if (qualified === "unqualified") conditions.push(eq(websiteVisitors.qualified, false));
    if (titleFilter) conditions.push(ilike(websiteVisitors.jobTitle, `%${titleFilter}%`));
    if (seniority) conditions.push(eq(websiteVisitors.seniority, seniority));
    if (department) conditions.push(eq(websiteVisitors.department, department));
    if (location) conditions.push(ilike(websiteVisitors.location, `%${location}%`));
    if (emailFilter) conditions.push(ilike(websiteVisitors.visitorEmail, `%${emailFilter}%`));
    if (hasPhone) conditions.push(sql`${websiteVisitors.phone} is not null`);
    if (repeatOnly) conditions.push(sql`${websiteVisitors.sessions} > 1`);
    if (sessionsMin) conditions.push(gte(websiteVisitors.sessions, Number(sessionsMin)));
    if (sessionsMax) conditions.push(lte(websiteVisitors.sessions, Number(sessionsMax)));
    if (pageviewsMin)
      conditions.push(sql`jsonb_array_length(${websiteVisitors.pagesViewed}) >= ${Number(pageviewsMin)}`);
    if (pageviewsMax)
      conditions.push(sql`jsonb_array_length(${websiteVisitors.pagesViewed}) <= ${Number(pageviewsMax)}`);
    if (keyPages)
      conditions.push(sql`${websiteVisitors.pagesViewed}::text ilike ${`%${keyPages}%`}`);
    if (lastSeen && WINDOW_MS[lastSeen])
      conditions.push(gte(websiteVisitors.lastSeenAt, new Date(Date.now() - WINDOW_MS[lastSeen])));
    if (firstSeen && WINDOW_MS[firstSeen])
      conditions.push(gte(websiteVisitors.firstSeenAt, new Date(Date.now() - WINDOW_MS[firstSeen])));
    if (search) {
      conditions.push(
        sql`(${ilike(websiteVisitors.visitorEmail, `%${search}%`)} or ${ilike(
          websiteVisitors.company,
          `%${search}%`
        )} or ${ilike(websiteVisitors.jobTitle, `%${search}%`)})`
      );
    }

    const [visitors, domains] = await Promise.all([
      db
        .select()
        .from(websiteVisitors)
        .where(and(...conditions))
        .orderBy(desc(websiteVisitors.lastSeenAt))
        .limit(200),
      db
        .select({ domain: trackedDomains.domain })
        .from(trackedDomains)
        .where(eq(trackedDomains.userId, user.id)),
    ]);

    return NextResponse.json({
      visitors,
      domains: domains.map((d) => d.domain),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
