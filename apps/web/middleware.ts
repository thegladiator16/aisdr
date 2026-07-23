import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { authLimiter, mutationLimiter, readLimiter, checkLimit } from "@/lib/ratelimit";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/contact(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/demo(.*)",
  "/features(.*)",
  "/solutions(.*)",
  "/invite(.*)",
  "/api/team/invite/(.*)",
  "/api/v1/health",
  "/api/geo",
  "/api/debug/(.*)",
  "/api/billing/status",
  "/api/enrichment/status",
  "/api/v1/billing/webhook(.*)",
  "/api/billing/webhook/(.*)",
  "/api/webhooks/(.*)",
  "/api/hooks/lead/(.*)",
  // Public tracking pixel — anonymous email recipients must be able to hit
  // it without a Clerk session. Handler validates trackingId itself.
  "/api/track",
  // Third-party return / OAuth callback URLs — the browser lands here from
  // an external origin and may not have a valid session cookie. Each
  // handler enforces its own auth + short-circuits with a 302 to the app.
  "/api/billing/paypal-return",
  "/api/v1/integrations/(.*)/callback",
  "/robots.txt",
  "/sitemap.xml",
  "/icon(.*)",
  "/apple-icon(.*)",
  "/og-image(.*)",
  "/favicon.ico",
  "/manifest.webmanifest",
]);

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isApiRoute = createRouteMatcher(["/api/(.*)"]);
// Rate limiting bypasses — cheap read-only status endpoints, webhooks
// (already signature-verified), and health/debug endpoints must not pay
// the Upstash round-trip on the Edge critical path.
const skipRateLimit = createRouteMatcher([
  "/api/v1/health",
  "/api/geo",
  "/api/debug/(.*)",
  "/api/billing/status",
  "/api/enrichment/status",
  "/api/webhooks/(.*)",
  "/api/hooks/lead/(.*)",
  "/api/v1/billing/webhook(.*)",
  "/api/billing/webhook/(.*)",
]);
// Only the actual auth POST/action endpoints get the strict 10/min limit,
// not the /sign-in and /sign-up HTML page loads (which prefetch too).
const isAuthEndpoint = createRouteMatcher([
  "/api/webhooks/(.*)",
  "/api/hooks/lead/(.*)",
]);

const IS_DEV = process.env.NODE_ENV !== "production";

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export default clerkMiddleware(async (auth, req) => {
  try {
    // Defense-in-depth: block CVE-2025-29927 middleware bypass header
    if (req.headers.get("x-middleware-subrequest")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const path = req.nextUrl.pathname;
    const method = req.method;
    const apiRoute = isApiRoute(req);
    const authPage = isAuthPage(req);
    const publicRoute = isPublicRoute(req);

    // Short-circuit for public non-API pages (marketing / landing) — no
    // Clerk auth work, no rate limit, no logging. Cuts Edge CPU per request.
    if (publicRoute && !apiRoute && !authPage) {
      return;
    }

    const { userId, sessionId } = auth();

    // --- Rate limiting (fail-open; skipped if Upstash not configured) ---
    // Skip for read-only status endpoints, webhooks (signature-verified),
    // and health/debug — none of them benefit from Upstash gating.
    if ((apiRoute || authPage) && !skipRateLimit(req)) {
      const rateLimitKey = userId ?? `ip:${getClientIp(req)}`;
      let limiter = readLimiter;
      if (isAuthEndpoint(req)) {
        limiter = authLimiter;
      } else if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
        limiter = mutationLimiter;
      }
      const rl = await checkLimit(limiter, rateLimitKey);
      if (!rl.success) {
        const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(rl.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rl.reset),
            },
          }
        );
      }
    }

    // --- Logging (dev only) ---
    if (IS_DEV) {
      const isNoisy =
        path.startsWith("/_next") ||
        path.startsWith("/favicon") ||
        path === "/api/debug/auth-state";
      if (!isNoisy) {
        console.log(`[mw] ${method} ${path} userId=${userId ?? "null"} sess=${sessionId ?? "null"}`);
      }
    }

    // Authenticated users visiting sign-in/sign-up → dashboard
    if (userId && authPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Unauthenticated users hitting private routes
    if (!userId && !publicRoute) {
      if (apiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = new URL("/sign-in", req.url);
      url.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  } catch (err) {
    // Ultimate safety net — middleware must never bring down the site
    console.error("[mw] uncaught middleware error, allowing request:", err);
  }
});

export const config = {
  matcher: [
    // Skip static file extensions AND well-known static paths so middleware
    // never runs for robots/sitemap/manifest/etc.
    "/((?!_next|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|favicon\\.ico|icon|apple-icon|og-image|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml|map|pdf|mp4)).*)",
    "/(api|trpc)(.*)",
  ],
};
