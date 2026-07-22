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
  "/api/debug/(.*)",
  "/api/billing/status",
  "/api/enrichment/status",
  "/api/v1/billing/webhook(.*)",
  "/api/billing/webhook/(.*)",
  "/api/webhooks/(.*)",
  "/api/hooks/lead/(.*)",
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
const isAuthEndpoint = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
  "/api/hooks/lead/(.*)",
]);

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

    const { userId, sessionId } = auth();
    const path = req.nextUrl.pathname;
    const method = req.method;

    // --- Rate limiting (fail-open; skipped if Upstash not configured) ---
    if (isApiRoute(req) || isAuthPage(req)) {
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

    const isNoisy =
      path.startsWith("/_next") ||
      path.startsWith("/favicon") ||
      path === "/api/debug/auth-state";
    if (!isNoisy) {
      const clientCookie = req.cookies.get("__client")?.value ? "y" : "n";
      const sessionCookie = req.cookies.get("__session")?.value ? "y" : "n";
      const uatCookie = req.cookies.get("__client_uat")?.value ? "y" : "n";
      console.log(
        `[mw] ${method} ${path} userId=${userId ?? "null"} sess=${sessionId ?? "null"} cookies(client=${clientCookie},session=${sessionCookie},uat=${uatCookie})`
      );
    }

    if (userId && isAuthPage(req)) {
      console.log(`[mw] REDIRECT auth-page-while-signed-in ${path} → /dashboard (userId=${userId})`);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!userId && !isPublicRoute(req)) {
      if (isApiRoute(req)) {
        console.log(`[mw] 401 unauth-api ${path}`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log(`[mw] REDIRECT unauth-private-page ${path} → /sign-in`);
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
