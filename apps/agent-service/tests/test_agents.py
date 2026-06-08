"""
Unit tests for AI agent service.
Run with: pytest tests/test_agents.py -v
"""
import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from models.schemas import (
    LeadResearchRequest,
    MessageGenerationRequest,
    ReplyAnalysisRequest,
    Channel,
    Tone,
)


class TestLeadResearcher:
    @pytest.mark.asyncio
    async def test_research_returns_valid_schema(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = '''
        {
            "lead_id": "test-123",
            "research_summary": "John is CEO at Acme Corp, a SaaS company.",
            "recent_activity": [{"type": "funding", "content": "Raised $2M", "date": "2026-01-01"}],
            "pain_points": ["Scaling sales", "Lead quality"],
            "personality_notes": "Direct communicator",
            "icebreakers": ["Congrats on your $2M raise!"],
            "score": 85,
            "confidence": 70
        }
        '''

        with patch("agents.lead_researcher.client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            with patch("agents.lead_researcher.scrape_linkedin_profile", AsyncMock(return_value="")):
                with patch("agents.lead_researcher.scrape_company_website", AsyncMock(return_value="")):
                    from agents.lead_researcher import research_lead
                    result = await research_lead(LeadResearchRequest(
                        lead_id="test-123",
                        full_name="John Doe",
                        company_name="Acme Corp",
                        job_title="CEO",
                    ))

        assert result.lead_id == "test-123"
        assert result.score == 85
        assert result.confidence == 70
        assert len(result.icebreakers) >= 1
        assert isinstance(result.pain_points, list)

    @pytest.mark.asyncio
    async def test_research_fallback_on_parse_error(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = "not valid json"

        with patch("agents.lead_researcher.client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            with patch("agents.lead_researcher.scrape_linkedin_profile", AsyncMock(return_value="")):
                with patch("agents.lead_researcher.scrape_company_website", AsyncMock(return_value="")):
                    from agents.lead_researcher import research_lead
                    result = await research_lead(LeadResearchRequest(
                        lead_id="fallback-test",
                        full_name="Jane Smith",
                        company_name="TechCo",
                    ))

        assert result.lead_id == "fallback-test"
        assert result.score == 50
        assert result.confidence == 20


class TestMessageWriter:
    @pytest.mark.asyncio
    async def test_first_step_email_under_100_words(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = '''
        {
            "subject": "Quick question",
            "body": "Hi Priya,\\n\\nLoved your post on scaling sales at early-stage startups. We help B2B founders automate outreach — our users average 12 meetings in the first 30 days.\\n\\nWorth a 15-min call this week?\\n\\nRahul",
            "personalization_score": 85
        }
        '''
        mock_response.usage = MagicMock(input_tokens=100, output_tokens=80)

        with patch("agents.message_writer.client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            from agents.message_writer import generate_message
            result = await generate_message(MessageGenerationRequest(
                lead_id="test-lead",
                channel=Channel.EMAIL,
                step_number=1,
                tone=Tone.PROFESSIONAL_WARM,
                sender_name="Rahul",
                sender_company="AI SDR",
                sender_value_proposition="We automate B2B sales outreach",
                lead_name="Priya Sharma",
                lead_company="GrowthOS",
                lead_job_title="CEO",
            ))

        word_count = len(result.body.split())
        assert word_count <= 100, f"Email too long: {word_count} words"
        assert result.personalization_score > 0
        assert result.subject is not None

    @pytest.mark.asyncio
    async def test_message_mentions_lead_company(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = '''
        {
            "subject": "GrowthOS + AI SDR",
            "body": "Hi Priya, I noticed GrowthOS just raised Series A — congrats! Our platform helps companies like yours book 10+ meetings/month automatically.",
            "personalization_score": 90
        }
        '''
        mock_response.usage = MagicMock(input_tokens=100, output_tokens=50)

        with patch("agents.message_writer.client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            from agents.message_writer import generate_message
            result = await generate_message(MessageGenerationRequest(
                lead_id="test-lead-2",
                channel=Channel.EMAIL,
                step_number=1,
                tone=Tone.PROFESSIONAL_WARM,
                sender_name="Rahul",
                sender_company="AI SDR",
                sender_value_proposition="We automate B2B sales outreach",
                lead_name="Priya Sharma",
                lead_company="GrowthOS",
                lead_job_title="CEO",
            ))

        assert "GrowthOS" in result.body or "Priya" in result.body

    @pytest.mark.asyncio
    async def test_fallback_message_generated_on_error(self):
        with patch("agents.message_writer.client") as mock_client:
            mock_client.messages.create = AsyncMock(side_effect=Exception("API error"))
            from agents.message_writer import generate_message
            result = await generate_message(MessageGenerationRequest(
                lead_id="fallback-lead",
                channel=Channel.EMAIL,
                step_number=1,
                tone=Tone.PROFESSIONAL_WARM,
                sender_name="Test",
                sender_company="TestCo",
                sender_value_proposition="Test value prop",
                lead_name="John Doe",
                lead_company="AcmeCorp",
                lead_job_title="CEO",
            ))

        assert result.model_used == "fallback"
        assert result.body is not None
        assert len(result.body) > 0


class TestReplyHandler:
    @pytest.mark.asyncio
    async def test_detects_positive_intent(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = '''
        {
            "sentiment": "positive",
            "intent": "interested",
            "requires_action": true,
            "action_type": "reply",
            "ai_suggested_reply": "Great! Let's find a time. Here's my calendar link: ...",
            "should_book_meeting": false,
            "urgency": "today"
        }
        '''

        with patch("agents.reply_handler.client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            from agents.reply_handler import analyze_reply
            result = await analyze_reply(ReplyAnalysisRequest(
                reply_id="reply-1",
                lead_id="lead-1",
                reply_body="Yes this sounds interesting! Tell me more.",
                original_message_body="Would you be open to a 15-min call?",
                channel="email",
            ))

        assert result.sentiment == "positive"
        assert result.intent == "interested"
        assert result.requires_action is True

    @pytest.mark.asyncio
    async def test_detects_unsubscribe_intent(self):
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = '''
        {
            "sentiment": "negative",
            "intent": "unsubscribe",
            "requires_action": true,
            "action_type": "mark_unsubscribed",
            "ai_suggested_reply": "",
            "should_book_meeting": false,
            "urgency": "immediate"
        }
        '''

        with patch("agents.reply_handler.client") as mock_client:
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            from agents.reply_handler import analyze_reply
            result = await analyze_reply(ReplyAnalysisRequest(
                reply_id="reply-2",
                lead_id="lead-2",
                reply_body="Please remove me from your list. Not interested.",
                original_message_body="Hi, I wanted to connect...",
                channel="email",
            ))

        assert result.intent == "unsubscribe"
        assert result.action_type == "mark_unsubscribed"
        assert result.urgency == "immediate"

    @pytest.mark.asyncio
    async def test_fallback_on_error(self):
        with patch("agents.reply_handler.client") as mock_client:
            mock_client.messages.create = AsyncMock(side_effect=Exception("timeout"))
            from agents.reply_handler import analyze_reply
            result = await analyze_reply(ReplyAnalysisRequest(
                reply_id="fallback-reply",
                lead_id="lead-3",
                reply_body="Sure, let's talk",
                original_message_body="...",
                channel="email",
            ))

        assert result.reply_id == "fallback-reply"
        assert result.sentiment == "neutral"
