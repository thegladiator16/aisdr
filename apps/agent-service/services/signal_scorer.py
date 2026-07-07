"""Score business signals from raw text using an OpenAI-compatible LLM."""

from __future__ import annotations

import json
import logging
import os
import string
import time
from typing import Any

from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI

from models.schemas import ScoreSignalResult

logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH = 4000
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are a B2B sales signal analyst. Given raw text from a data source,
extract the company involved, classify the signal type, score its relevance for
outbound sales (0.0 = irrelevant, 1.0 = highly actionable), and write a concise summary.

Signal types include: funding, hiring, product_launch, leadership_change, expansion,
partnership, acquisition, earnings, layoff, regulatory, other.

Score guidelines:
- 0.8-1.0: Clear buying intent or urgent trigger (funding round, hiring SDRs, new CTO)
- 0.5-0.7: Moderate relevance (general growth news, minor product update)
- 0.2-0.4: Weak signal (tangential mention, old news)
- 0.0-0.1: No actionable business signal"""

SCORE_SIGNAL_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "score_signal",
        "description": "Extract and score a business signal from raw text",
        "parameters": {
            "type": "object",
            "properties": {
                "company": {
                    "type": "string",
                    "description": "Company name mentioned or best inferred from context",
                },
                "signal_type": {
                    "type": "string",
                    "description": "Signal category (funding, hiring, product_launch, etc.)",
                },
                "score": {
                    "type": "number",
                    "description": "Relevance score from 0.0 to 1.0",
                },
                "summary": {
                    "type": "string",
                    "description": "One or two sentence summary of the signal",
                },
            },
            "required": ["company", "signal_type", "score", "summary"],
            "additionalProperties": False,
        },
    },
}

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable is not set")
        base_url = os.getenv("OPENAI_BASE_URL")
        kwargs: dict[str, str] = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        _client = AsyncOpenAI(**kwargs)
    return _client


def sanitize_text(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """Strip non-printable characters and cap length."""
    cleaned = "".join(ch for ch in text if ch in string.printable)
    return cleaned[:max_length].strip()


def _clamp_score(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _parse_tool_args(raw: str) -> dict[str, Any]:
    data = json.loads(raw)
    return {
        "company": str(data.get("company", "unknown")).strip() or "unknown",
        "signal_type": str(data.get("signal_type", "other")).strip() or "other",
        "score": _clamp_score(data.get("score", 0.0)),
        "summary": str(data.get("summary", "")).strip(),
    }


async def _call_with_tool_calling(client: AsyncOpenAI, user_prompt: str) -> dict[str, Any]:
    response = await client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        tools=[SCORE_SIGNAL_TOOL],
        tool_choice={"type": "function", "function": {"name": "score_signal"}},
        temperature=0.1,
        max_tokens=512,
    )
    message = response.choices[0].message
    if message.tool_calls:
        return _parse_tool_args(message.tool_calls[0].function.arguments)
    if message.content:
        return _parse_tool_args(message.content)
    raise ValueError("LLM returned no tool call or content")


async def _call_with_json_object(client: AsyncOpenAI, user_prompt: str) -> dict[str, Any]:
    response = await client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"{user_prompt}\n\n"
                    "Respond with a JSON object containing exactly these keys: "
                    "company, signal_type, score, summary."
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=512,
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("LLM returned empty content")
    return _parse_tool_args(content)


async def score_signal(text: str, source: str) -> ScoreSignalResult:
    """Sanitize input, call LLM, and return structured signal score."""
    start = time.perf_counter()
    sanitized = sanitize_text(text)
    if not sanitized:
        raise ValueError("Text is empty after sanitization")

    user_prompt = f"Source: {source}\n\nRaw text:\n{sanitized}"
    client = _get_client()

    logger.info(
        "score_signal_request",
        extra={
            "event": "score_signal_request",
            "source": source,
            "input_chars": len(sanitized),
        },
    )

    try:
        try:
            parsed = await _call_with_tool_calling(client, user_prompt)
            method = "tool_calling"
        except (ValueError, json.JSONDecodeError, APIStatusError) as tool_err:
            logger.warning(
                "score_signal_tool_calling_fallback",
                extra={
                    "event": "score_signal_tool_calling_fallback",
                    "source": source,
                    "error": str(tool_err),
                },
            )
            parsed = await _call_with_json_object(client, user_prompt)
            method = "json_object"
    except APITimeoutError as exc:
        latency_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "score_signal_llm_timeout",
            extra={
                "event": "score_signal_llm_timeout",
                "source": source,
                "latency_ms": round(latency_ms, 2),
            },
        )
        raise TimeoutError("LLM request timed out") from exc
    except APIConnectionError as exc:
        latency_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "score_signal_llm_connection_error",
            extra={
                "event": "score_signal_llm_connection_error",
                "source": source,
                "latency_ms": round(latency_ms, 2),
                "error": str(exc),
            },
        )
        raise ConnectionError("Failed to connect to LLM API") from exc
    except APIStatusError as exc:
        latency_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "score_signal_llm_api_error",
            extra={
                "event": "score_signal_llm_api_error",
                "source": source,
                "latency_ms": round(latency_ms, 2),
                "status_code": exc.status_code,
                "error": str(exc),
            },
        )
        raise RuntimeError(f"LLM API error: {exc.message}") from exc

    latency_ms = (time.perf_counter() - start) * 1000
    result = ScoreSignalResult(
        company=parsed["company"],
        signal_type=parsed["signal_type"],
        score=parsed["score"],
        summary=parsed["summary"],
        source=source,
        latency_ms=round(latency_ms, 2),
    )

    logger.info(
        "score_signal_success",
        extra={
            "event": "score_signal_success",
            "source": source,
            "method": method,
            "company": result.company,
            "signal_type": result.signal_type,
            "score": result.score,
            "latency_ms": result.latency_ms,
        },
    )
    return result
