"""Shared Claude-calling plumbing reused by every sport agent (Football, Basketball,
Tennis, ...). Each agent supplies its own system prompt, Pydantic output schema, match
context, and a mock-response factory; this module owns the mock/live branching and the
actual `messages.parse()` call so agents don't each hand-roll it."""

import json
from typing import Callable, TypeVar

import anthropic
from django.conf import settings
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AnalysisUnavailable(Exception):
    """Raised when an analysis cannot be produced right now (no key, refusal,
    truncation). Views map this to a 503 rather than a 500."""


def call_agent(
    *,
    output_format: type[T],
    system: str,
    context: dict,
    mock_factory: Callable[[dict], T],
) -> tuple[T, str]:
    """Returns (parsed_output, model_label). model_label is "mock" in mock mode,
    otherwise the configured ANTHROPIC_MODEL."""
    if settings.AI_AGENT_MODE == "mock":
        return mock_factory(context), "mock"

    if not settings.ANTHROPIC_API_KEY:
        raise AnalysisUnavailable(
            "AI analysis is not configured — set ANTHROPIC_API_KEY in .env, "
            "or set AI_AGENT_MODE=mock to use simulated analysis."
        )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.parse(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=2048,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        output_format=output_format,
        system=system,
        messages=[{"role": "user", "content": json.dumps(context)}],
    )

    if response.stop_reason == "refusal":
        raise AnalysisUnavailable("Analysis temporarily unavailable for this match.")

    parsed = response.parsed_output
    if parsed is None:
        raise AnalysisUnavailable("Analysis temporarily unavailable — please try again.")

    return parsed, settings.ANTHROPIC_MODEL
