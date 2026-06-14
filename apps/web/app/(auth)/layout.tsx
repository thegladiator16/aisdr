import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@/components/layout/AuthShell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  return <AuthShell>{children}</AuthShell>;
}
