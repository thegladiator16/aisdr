import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  // Public invite-accept landing page — an invited person may not have an
  // account yet, so this must be reachable before Clerk auth exists. The
  // page itself (app/invite/[token]/page.tsx) shows sign-in/sign-up prompts
  // when the visitor isn't authenticated yet, and calls GET
  // /api/team/invite/[token] (also public — the route handler doesn't
  // require auth; the POST handler on that same path still requires auth
  // and verifies the signer's email matches the invited email).
  "/invite(.*)",
  "/api/team/invite/(.*)",
  "/api/v1/health",
  "/api/debug/(.*)",
  // Public payments-config check — the checkout modal on the public
  // pricing page needs to be able to render a friendly "not configured"
  // banner without requiring a session first. No per-user data leaks.
  "/api/billing/status",
  // Public enrichment-config check — matches the billing/status pattern.
  // The lead sidepanel pre-checks this so it can render the amber "provider
  // not configured" banner without triggering a 503 on click. No per-user
  // data is exposed; only which vendor (if any) is wired up.
  "/api/enrichment/status",
  "/api/v1/billing/webhook(.*)",
  "/api/billing/webhook/(.*)",
  "/api/webhooks/(.*)",
  // Inbound-lead webhook — called by external systems (Zapier, form
  // providers, CRMs) that authenticate via the `arya_...` API key in
  // the URL / x-arya-key header, not via a Clerk session.
  "/api/hooks/lead/(.*)",
  // System / SEO / icon routes — must be reachable to logged-out crawlers
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

export default clerkMiddleware((auth, req) => {
  // Defense-in-depth: block CVE-2025-29927 middleware bypass header even
  // though Next.js 14.2.25+ already strips it at the framework level.
  if (req.headers.get("x-middleware-subrequest")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, sessionId } = auth();
  const path = req.nextUrl.pathname;

  // Log every non-static request so we can trace the redirect chain in
  // Vercel logs. Look for lines starting with [mw]. Filter to trace only
  // meaningful routes — skip icons/favicon/etc.
  const isNoisy =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path === "/api/debug/auth-state";
  if (!isNoisy) {
    const clientCookie = req.cookies.get("__client")?.value ? "y" : "n";
    const sessionCookie = req.cookies.get("__session")?.value ? "y" : "n";
    const uatCookie = req.cookies.get("__client_uat")?.value ? "y" : "n";
    console.log(
      `[mw] ${req.method} ${path} userId=${userId ?? "null"} sess=${sessionId ?? "null"} cookies(client=${clientCookie},session=${sessionCookie},uat=${uatCookie})`
    );
  }

  // Authenticated users visiting sign-in/sign-up → redirect to dashboard
  if (userId && isAuthPage(req)) {
    console.log(`[mw] REDIRECT auth-page-while-signed-in ${path} → /dashboard (userId=${userId})`);
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated users hitting private routes
  if (!userId && !isPublicRoute(req)) {
    // API routes: return JSON 401 so clients can detect + refresh tokens
    if (isApiRoute(req)) {
      console.log(`[mw] 401 unauth-api ${path}`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Pages: redirect to sign-in (preserve where the user was going)
    console.log(`[mw] REDIRECT unauth-private-page ${path} → /sign-in`);
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
