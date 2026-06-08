import anthropic
import json
import logging
import asyncio
from models.schemas import ReplyAnalysisRequest, ReplyAnalysis
from prompts.messaging import REPLY_ANALYSIS_SYSTEM

logger = logging.getLogger(__name__)
client = anthropic.AsyncAnthropic()


async def analyze_reply(request: ReplyAnalysisRequest) -> ReplyAnalysis:
    for attempt in range(3):
        try:
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=500,
                system=REPLY_ANALYSIS_SYSTEM,
                messages=[
                    {
                        "role": "user",
                        "content": f"""ORIGINAL MESSAGE:
{request.original_message_body[:500]}

REPLY RECEIVED:
{request.reply_body}

CALENDAR LINK: {request.sender_calendar_link or 'Not provided'}

Analyze this reply and return JSON.""",
                    }
                ],
            )

            content = response.content[0].text.strip()
            if "```" in content:
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content.strip())
            data["reply_id"] = request.reply_id
            return ReplyAnalysis(**data)

        except Exception as e:
            logger.warning(f"Reply analysis attempt {attempt + 1} failed: {e}")
            if attempt == 2:
                break
            await asyncio.sleep(1)

    return ReplyAnalysis(
        reply_id=request.reply_id,
        sentiment="neutral",
        intent="ask_more_info",
        requires_action=True,
        action_type="reply",
        ai_suggested_reply=(
            "Thank you for your response. I would love to share more details."
        ),
        should_book_meeting=False,
        urgency="this_week",
    )
