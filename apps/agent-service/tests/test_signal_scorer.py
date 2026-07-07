"""Tests for signal scoring endpoint and service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app
from services.signal_scorer import sanitize_text, score_signal


client = TestClient(app)


class TestSanitizeText:
    def test_strips_non_printable(self):
        raw = "Acme Corp\x00\x07 raised $10M\n"
        assert sanitize_text(raw) == "Acme Corp raised $10M"

    def test_caps_length(self):
        assert len(sanitize_text("a" * 5000)) == 4000

    def test_strips_whitespace_edges(self):
        assert sanitize_text("  hello  ") == "hello"


class TestScoreSignalEndpoint:
    def test_validation_rejects_empty_text(self):
        response = client.post("/score-signal", json={"text": "", "source": "linkedin"})
        assert response.status_code == 422

    def test_validation_rejects_empty_source(self):
        response = client.post("/score-signal", json={"text": "Acme hiring", "source": ""})
        assert response.status_code == 422

    @patch("routers.signals.score_signal", new_callable=AsyncMock)
    def test_returns_scored_result(self, mock_score):
        from models.schemas import ScoreSignalResult

        mock_score.return_value = ScoreSignalResult(
            company="Acme Corp",
            signal_type="hiring",
            score=0.85,
            summary="Acme is hiring 5 SDRs.",
            source="linkedin",
            latency_ms=120.5,
        )
        response = client.post(
            "/score-signal",
            json={"text": "Acme Corp is hiring 5 SDRs", "source": "linkedin"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["company"] == "Acme Corp"
        assert data["signal_type"] == "hiring"
        assert data["score"] == 0.85
        assert data["latency_ms"] == 120.5

    @patch("routers.signals.score_signal", new_callable=AsyncMock)
    def test_empty_after_sanitize_returns_400(self, mock_score):
        mock_score.side_effect = ValueError("Text is empty after sanitization")
        response = client.post(
            "/score-signal",
            json={"text": "\x00\x07", "source": "news"},
        )
        assert response.status_code == 400


class TestScoreSignalService:
    @pytest.mark.asyncio
    @patch("services.signal_scorer._get_client")
    async def test_uses_tool_calling(self, mock_get_client):
        mock_client = AsyncMock()
        mock_get_client.return_value = mock_client

        tool_call = MagicMock()
        tool_call.function.arguments = (
            '{"company": "Beta Inc", "signal_type": "funding", '
            '"score": 0.9, "summary": "Series B raised."}'
        )
        mock_message = MagicMock()
        mock_message.tool_calls = [tool_call]
        mock_message.content = None
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=mock_message)]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        result = await score_signal("Beta Inc raised Series B", "crunchbase")
        assert result.company == "Beta Inc"
        assert result.signal_type == "funding"
        assert result.score == 0.9
        assert result.source == "crunchbase"
        assert result.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_empty_text_raises(self):
        with pytest.raises(ValueError, match="empty after sanitization"):
            await score_signal("\x00\x07", "test")
