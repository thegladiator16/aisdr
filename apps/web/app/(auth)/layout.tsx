import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@/components/layout/AuthShell";

// Force dynamic rendering. Without this, Next.js can serve this layout from
// the prerender path where Clerk's auth() cannot see the request cookie and
// returns userId === null — bouncing every signed-in user back to /sign-in.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Belt-and-suspenders: reading headers() explicitly opts this render out
  // of any static path, so auth() below always sees the request context.
  const h = headers();
  const { userId, sessionId } = auth();
  const path = h.get("x-invoke-path") ?? h.get("referer") ?? "?";
  console.log(
    `[layout(auth)] userId=${userId ?? "null"} sess=${sessionId ?? "null"} ref=${path}`
  );
  if (!userId) {
    console.log(`[layout(auth)] REDIRECT → /sign-in (no userId in SSR context)`);
    redirect("/sign-in");
  }

  return <AuthShell>{children}</AuthShell>;
}
