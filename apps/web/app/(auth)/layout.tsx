import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@/components/layout/AuthShell";

// Force dynamic rendering. Without this, Next.js can serve this layout from
// the prerender path where Clerk's auth() cannot see the request cookie and
// returns userId === null — bouncing every signed-in user back to /sign-in.
// AuthCard's useAuth() then sees isSignedIn === true and hard-redirects to
// /dashboard, producing the observed sign-in ↔ dashboard loop.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Belt-and-suspenders: reading headers() explicitly opts this render out
  // of any static path, so auth() below always sees the request context.
  headers();
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  return <AuthShell>{children}</AuthShell>;
}
