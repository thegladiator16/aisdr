import anthropic
import json
import logging
import asyncio
from models.schemas import MessageGenerationRequest, GeneratedMessage, Channel
from prompts.messaging import (
    EMAIL_SYSTEM,
    LINKEDIN_DM_SYSTEM,
    WHATSAPP_SYSTEM,
    FOLLOWUP_SYSTEM,
    build_message_prompt,
)

logger = logging.getLogger(__name__)
client = anthropic.AsyncAnthropic()

SYSTEM_PROMPTS = {
    Channel.EMAIL: EMAIL_SYSTEM,
    Channel.LINKEDIN_CONNECTION: LINKEDIN_DM_SYSTEM,
    Channel.LINKEDIN_DM: LINKEDIN_DM_SYSTEM,
    Channel.WHATSAPP: WHATSAPP_SYSTEM,
}


def get_system_prompt(channel: Channel, step_number: int) -> str:
    if step_number > 1:
        return FOLLOWUP_SYSTEM
    return SYSTEM_PROMPTS.get(channel, EMAIL_SYSTEM)


async def generate_message(request: MessageGenerationRequest) -> GeneratedMessage:
    system = get_system_prompt(request.channel, request.step_number)
    user_prompt = build_message_prompt(request.dict())

    for attempt in range(3):
        try:
            response = await client.messages.create(
                model="claude-sonnet-4-6-20250514",
                max_tokens=500,
                system=system,
                messages=[{"role": "user", "content": user_prompt}],
            )

            content = response.content[0].text.strip()
            if "```" in content:
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content.strip())
            return GeneratedMessage(
                lead_id=request.lead_id,
                channel=request.channel,
                step_number=request.step_number,
                subject=data.get("subject"),
                body=data["body"],
                personalization_score=data.get("personalization_score", 70),
                tokens_used=(
                    response.usage.input_tokens + response.usage.output_tokens
                ),
                model_used="claude-sonnet-4-6",
            )

        except Exception as e:
            logger.warning(f"Message generation attempt {attempt + 1} failed: {e}")
            if attempt == 2:
                break
            await asyncio.sleep(1)

    first_name = request.lead_name.split()[0] if request.lead_name else "there"
    return GeneratedMessage(
        lead_id=request.lead_id,
        channel=request.channel,
        step_number=request.step_number,
        subject=f"Quick question, {first_name}",
        body=(
            f"Hi {first_name},\n\n"
            f"I noticed {request.lead_company} and thought there might be a "
            f"great fit with what we're building at {request.sender_company}.\n\n"
            f"Would you be open to a 15-min call?\n\n"
            f"{request.sender_name}"
        ),
        personalization_score=20,
        tokens_used=0,
        model_used="fallback",
    )
