import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@/components/layout/AuthShell";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  headers();
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <Suspense>
      <AuthShell>{children}</AuthShell>
    </Suspense>
  );
}
