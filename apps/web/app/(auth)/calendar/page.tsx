import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { meetings, leads } from "@aisdr/db/schema";
import { eq } from "drizzle-orm";
import { Calendar, Video } from "lucide-react";
import { format } from "date-fns";

async function fetchMeetings(userId: string) {
  return db
    .select({
      meeting: meetings,
      lead: {
        fullName: leads.fullName,
        companyName: leads.companyName,
        email: leads.email,
      },
    })
    .from(meetings)
    .leftJoin(leads, eq(meetings.leadId, leads.id))
    .where(eq(meetings.userId, userId))
    .orderBy(meetings.scheduledAt)
    .limit(20);
}

type MeetingRow = Awaited<ReturnType<typeof fetchMeetings>>[0];

export default async function CalendarPage() {
  let upcomingMeetings: MeetingRow[] = [];

  try {
    const user = await getCurrentUser();
    if (user) {
      upcomingMeetings = await fetchMeetings(user.id);
    }
  } catch {
    upcomingMeetings = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {upcomingMeetings.length} scheduled meeting{upcomingMeetings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {upcomingMeetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">No meetings yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            When leads book meetings through your outreach, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {upcomingMeetings.map(({ meeting, lead }) => (
            <div
              key={meeting.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  {lead?.fullName ?? "Unknown Lead"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lead?.companyName} · {meeting.durationMinutes}min call
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(meeting.scheduledAt), "EEEE, MMM d 'at' h:mm a")}
                </p>
              </div>
              {meeting.meetingUrl && (
                <a
                  href={meeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors shrink-0"
                >
                  <Video className="h-3.5 w-3.5" />
                  Join
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
