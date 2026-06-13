import { getCurrentUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  let firstName = "";

  try {
    const user = await getCurrentUser();
    firstName = user?.fullName?.split(" ")[0] ?? "";
  } catch {
    // render without name
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Good morning{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your outreach today.
        </p>
      </div>

      <DashboardClient />
    </div>
  );
}
