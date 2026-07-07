from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class Channel(str, Enum):
    EMAIL = "email"
    LINKEDIN_CONNECTION = "linkedin_connection"
    LINKEDIN_DM = "linkedin_dm"
    WHATSAPP = "whatsapp"


class Tone(str, Enum):
    PROFESSIONAL_FORMAL = "professional_formal"
    PROFESSIONAL_WARM = "professional_warm"
    CASUAL_FRIENDLY = "casual_friendly"
    DIRECT_BOLD = "direct_bold"


class LeadResearchRequest(BaseModel):
    lead_id: str
    linkedin_url: Optional[str] = None
    company_website: Optional[str] = None
    full_name: str
    company_name: str
    job_title: Optional[str] = None


class RecentActivity(BaseModel):
    type: str
    content: str
    date: str


class LeadResearch(BaseModel):
    lead_id: str
    research_summary: str
    recent_activity: List[Dict[str, Any]] = []
    pain_points: List[str] = []
    personality_notes: str
    icebreakers: List[str] = []
    score: int = Field(ge=0, le=100)
    confidence: int = Field(ge=0, le=100)


class MessageGenerationRequest(BaseModel):
    lead_id: str
    channel: Channel
    step_number: int
    tone: Tone
    language: str = "english"
    goal: str = "book_meeting"

    sender_name: str
    sender_company: str
    sender_value_proposition: str
    sender_calendar_link: Optional[str] = None

    lead_name: str
    lead_company: str
    lead_job_title: str
    lead_research: Optional[LeadResearch] = None

    previous_messages: List[Dict[str, str]] = []


class GeneratedMessage(BaseModel):
    lead_id: str
    channel: Channel
    step_number: int
    subject: Optional[str] = None
    body: str
    personalization_score: int = Field(ge=0, le=100)
    tokens_used: int
    model_used: str


class ReplyAnalysisRequest(BaseModel):
    reply_id: str
    lead_id: str
    reply_body: str
    original_message_body: str
    channel: str
    sender_calendar_link: Optional[str] = None


class ReplyAnalysis(BaseModel):
    reply_id: str
    sentiment: str
    intent: str
    requires_action: bool
    action_type: str
    ai_suggested_reply: str
    should_book_meeting: bool
    urgency: str


class OutreachJobRequest(BaseModel):
    lead_id: str
    campaign_id: str
    user_id: str
    channel: Channel
    step_number: int
    sequence_id: Optional[str] = None
    enrollment_id: Optional[str] = None


class ScoreSignalRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Raw signal text to score")
    source: str = Field(..., min_length=1, description="Source name (e.g. linkedin, news, job_board)")


class ScoreSignalResult(BaseModel):
    company: str
    signal_type: str
    score: float = Field(ge=0.0, le=1.0)
    summary: str
    source: str
    latency_ms: float
