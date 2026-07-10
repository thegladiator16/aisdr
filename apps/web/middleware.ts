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
  "/api/v1/health",
  "/api/debug/(.*)",
  "/api/v1/billing/webhook(.*)",
  "/api/billing/webhook/(.*)",
  "/api/webhooks/(.*)",
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
  const { userId } = auth();

  // Authenticated users visiting sign-in/sign-up → redirect to dashboard
  if (userId && isAuthPage(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated users hitting private routes
  if (!userId && !isPublicRoute(req)) {
    // API routes: return JSON 401 so clients can detect + refresh tokens
    if (isApiRoute(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Pages: redirect to sign-in (preserve where the user was going)
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
