import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint — reports what Clerk auth() sees on the server plus
 * cookie / header state, so we can figure out why a redirect loop is
 * happening. Safe to expose: reports only cookie NAMES (not values) and
 * publishable-key metadata (never the secret).
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const authResult = auth();
  const cookieStore = cookies();
  const headerStore = headers();

  const cookieNames = cookieStore.getAll().map((c) => c.name);
  const clerkCookies = cookieNames.filter(
    (n) => n.startsWith("__session") || n.startsWith("__client")
  );

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.CLERK_SECRET_KEY ?? "";

  return NextResponse.json({
    auth: {
      userId: authResult.userId,
      sessionId: authResult.sessionId,
      orgId: authResult.orgId,
      actor: authResult.actor,
      sessionClaimsPresent: !!authResult.sessionClaims,
    },
    cookies: {
      total: cookieNames.length,
      clerkCookies,
      allCookieNames: cookieNames,
    },
    request: {
      host: headerStore.get("host"),
      origin: headerStore.get("origin"),
      referer: headerStore.get("referer"),
      clerkAuthStatus: headerStore.get("x-clerk-auth-status"),
      clerkAuthReason: headerStore.get("x-clerk-auth-reason"),
    },
    clerkConfig: {
      publishableKeyPrefix: publishableKey.slice(0, 15),
      publishableKeyType: publishableKey.startsWith("pk_live_")
        ? "live"
        : publishableKey.startsWith("pk_test_")
        ? "test"
        : "unknown",
      publishableKeyLastFour: publishableKey.slice(-4),
      secretKeyType: secretKey.startsWith("sk_live_")
        ? "live"
        : secretKey.startsWith("sk_test_")
        ? "test"
        : "unknown",
      secretKeyLastFour: secretKey.slice(-4),
      keysMatch:
        (publishableKey.startsWith("pk_live_") && secretKey.startsWith("sk_live_")) ||
        (publishableKey.startsWith("pk_test_") && secretKey.startsWith("sk_test_")),
    },
    timestamp: new Date().toISOString(),
  });
}
