import os
import logging
from fastapi import APIRouter, Header, HTTPException
from models.schemas import (
    LeadResearchRequest,
    MessageGenerationRequest,
    ReplyAnalysisRequest,
    OutreachJobRequest,
)
from agents.lead_researcher import research_lead
from agents.message_writer import generate_message
from agents.reply_handler import analyze_reply

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])

AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "dev_secret")


def verify_token(x_internal_token: str) -> None:
    if x_internal_token != AI_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/research")
async def research_lead_endpoint(
    request: LeadResearchRequest,
    x_internal_token: str = Header(...),
):
    verify_token(x_internal_token)
    result = await research_lead(request)
    return result


@router.post("/write-message")
async def write_message_endpoint(
    request: MessageGenerationRequest,
    x_internal_token: str = Header(...),
):
    verify_token(x_internal_token)
    result = await generate_message(request)
    return result


@router.post("/analyze-reply")
async def analyze_reply_endpoint(
    request: ReplyAnalysisRequest,
    x_internal_token: str = Header(...),
):
    verify_token(x_internal_token)
    result = await analyze_reply(request)
    return result


@router.post("/run-outreach")
async def run_outreach_endpoint(
    request: OutreachJobRequest,
    x_internal_token: str = Header(...),
):
    verify_token(x_internal_token)
    from agents.outreach_agent import outreach_graph

    result = await outreach_graph.ainvoke({
        "lead_id": request.lead_id,
        "campaign_id": request.campaign_id,
        "user_id": request.user_id,
        "channel": request.channel,
        "step_number": request.step_number,
        "sequence_id": request.sequence_id,
        "enrollment_id": request.enrollment_id,
        "research": None,
        "generated_message": None,
        "send_result": None,
        "error": None,
    })
    return {"status": "completed", "lead_id": request.lead_id, "result": result}
