import { getCurrentUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { AryaAvatar } from "@/components/arya/AryaAvatar";

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
      {/* Greeting */}
      <div className="flex items-start gap-4">
        <AryaAvatar size="md" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Arya is ready to find your next 50 leads.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <a
          href="/leads"
          className="rounded-lg bg-[#6C47FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5A38E0] transition-colors"
        >
          Find New Leads
        </a>
        <a
          href="/campaigns"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Launch Campaign
        </a>
        <a
          href="/inbox"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Inbox
        </a>
      </div>

      <DashboardClient />

      {/* Arya Activity Feed */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <AryaAvatar size="sm" />
          <h2 className="font-semibold text-gray-900">Arya&apos;s Activity</h2>
        </div>
        <div className="space-y-3">
          {[
            { time: "2m ago", text: "Found 3 new leads matching your ICP", color: "bg-violet-500" },
            { time: "15m ago", text: "Sent follow-up to Rahul at TechCorp", color: "bg-blue-500" },
            { time: "1h ago", text: "Reply detected from Priya Mehta, positive intent", color: "bg-emerald-500" },
            { time: "3h ago", text: "Meeting booked: Finova <> Demo Call, Tomorrow 3pm", color: "bg-amber-500" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3 text-sm">
              <div className={`h-2 w-2 rounded-full ${item.color} mt-1.5 shrink-0`} />
              <div className="flex-1">
                <p className="text-gray-700">{item.text}</p>
                <p className="text-xs text-gray-400">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
