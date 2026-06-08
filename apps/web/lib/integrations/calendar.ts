import { google } from "googleapis";

export class GoogleCalendarClient {
  private auth: ReturnType<typeof google.auth.OAuth2.prototype.constructor>;

  constructor(accessToken: string, refreshToken: string) {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    this.auth = oauth2 as never;
  }

  async createEvent(params: {
    title: string;
    startTime: string;
    durationMinutes: number;
    attendeeEmail: string;
    attendeeName?: string;
    description?: string;
  }): Promise<{ eventId: string; meetingUrl?: string; htmlLink: string }> {
    const calendar = google.calendar({ version: "v3", auth: this.auth as never });

    const start = new Date(params.startTime);
    const end = new Date(start.getTime() + params.durationMinutes * 60000);

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: params.title,
        description: params.description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: [{ email: params.attendeeEmail, displayName: params.attendeeName }],
        conferenceData: {
          createRequest: {
            requestId: `aisdr-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    return {
      eventId: event.data.id!,
      meetingUrl: event.data.hangoutLink ?? undefined,
      htmlLink: event.data.htmlLink!,
    };
  }

  async listUpcomingMeetings(maxResults = 10) {
    const calendar = google.calendar({ version: "v3", auth: this.auth as never });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items ?? [];
  }
}
