export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { trackedDomains } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureWebsiteVisitorsSchema } from "@/lib/db/ensure-schema";

const FETCH_TIMEOUT_MS = 8000;

// Real verification — no fake timeout. Fetches the domain's live homepage
// and checks whether the tracking snippet (unique per-domain verification
// token) actually appears in the returned HTML.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureWebsiteVisitorsSchema();

    const [tracked] = await db
      .select()
      .from(trackedDomains)
      .where(and(eq(trackedDomains.id, params.id), eq(trackedDomains.userId, user.id)))
      .limit(1);

    if (!tracked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let html = "";
    let fetchError: string | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(`https://${tracked.domain}`, {
        signal: controller.signal,
        headers: { "User-Agent": "AryaSDR-SnippetVerifier/1.0" },
      });
      clearTimeout(timeout);
      html = await res.text();
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Could not reach domain";
    }

    const found = html.includes(tracked.verificationToken);

    if (found) {
      await db
        .update(trackedDomains)
        .set({ verified: true })
        .where(eq(trackedDomains.id, tracked.id));
    }

    return NextResponse.json({
      verified: found,
      error: found ? undefined : fetchError ?? "Snippet not detected on the page yet",
    });
  } catch (err) {
    console.error("[website-visitors/domains/verify] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
