"""
Meeting booker agent — detects meeting intent from replies and
sends calendar booking links or creates Google Calendar events.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_calendar_link(
    lead_email: str,
    calendar_link: str,
    lead_name: str,
    sender_name: str,
) -> dict:
    """Send a calendar booking link to a lead via email."""
    body = (
        f"Hi {lead_name.split()[0]},\n\n"
        f"Great to hear from you! Here's a link to book a time that works for you:\n\n"
        f"{calendar_link}\n\n"
        f"Looking forward to connecting!\n\n"
        f"{sender_name}"
    )
    return {
        "success": True,
        "body": body,
        "calendar_link": calendar_link,
    }


async def create_calendar_event(
    access_token: str,
    refresh_token: str,
    attendee_email: str,
    title: str,
    start_time: str,
    duration_minutes: int = 30,
    meeting_url: Optional[str] = None,
) -> dict:
    """Create a Google Calendar event and invite the lead."""
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        import os

        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            token_uri="https://oauth2.googleapis.com/token",
        )

        service = build("calendar", "v3", credentials=creds)

        event = {
            "summary": title,
            "start": {"dateTime": start_time, "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": start_time, "timeZone": "Asia/Kolkata"},
            "attendees": [{"email": attendee_email}],
            "conferenceData": {
                "createRequest": {"requestId": f"aisdr-{attendee_email}"}
            }
            if not meeting_url
            else None,
        }

        if meeting_url:
            event["description"] = f"Meeting link: {meeting_url}"

        result = (
            service.events()
            .insert(
                calendarId="primary",
                body=event,
                conferenceDataVersion=1 if not meeting_url else 0,
                sendUpdates="all",
            )
            .execute()
        )

        return {
            "success": True,
            "event_id": result["id"],
            "meeting_url": result.get("hangoutLink", meeting_url),
        }

    except Exception as e:
        logger.error(f"Calendar event creation failed: {e}")
        return {"success": False, "error": str(e)}
