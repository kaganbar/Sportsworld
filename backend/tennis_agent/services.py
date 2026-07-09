import logging

from ai_common.service import AnalysisUnavailable, call_agent
from tennis import services as match_queries
from tennis.models import TennisMatch
from translations.service import translate

from .models import MatchAnalysis
from .schemas import Probabilities, TennisAnalysis

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the SportsWorld Tennis Agent, a professional tennis match
analyst. You receive structured pre-match context as JSON: the fixture (tournament,
round, surface implied by venue), each player's recent form, and the head-to-head
history between the two players.

Write an insightful pre-match analysis grounded ONLY in the data provided — do not
invent results or facts that are not in the context. Assess who arrives in better
form and why, and factor in the head-to-head record. Tennis matches cannot end in
a draw.

Your two probabilities (player1 win, player2 win) must be integers that sum to
exactly 100."""

LANGUAGE_INSTRUCTIONS = {
    "en": "",
    "he": "\n\nWrite the summary and key_factors in Hebrew (עברית). Use the Hebrew player names exactly as given in the context — do not use English/Latin spellings.",
}


def _build_match_context(match: TennisMatch, language: str = "en") -> dict:
    def tr(text):
        return translate(text, language)

    def results(qs):
        return [
            {
                "date": str(m.start_time.date()),
                "tournament": tr(m.tournament),
                "round": m.round,
                "player1": tr(m.player1.name),
                "player2": tr(m.player2.name),
                "winner": tr(m.winner.name) if m.winner_id else None,
            }
            for m in qs
        ]

    return {
        "fixture": {
            "tournament": tr(match.tournament),
            "round": match.round,
            "start_time": match.start_time.isoformat(),
            "venue": tr(match.venue),
            "player1": tr(match.player1.name),
            "player2": tr(match.player2.name),
        },
        "player1": {
            "name": tr(match.player1.name),
            "ranking": match.player1.ranking,
            "recent_form": results(match_queries.recent_results(match.player1)),
            "form_stats": match_queries.form_stats(match.player1),
        },
        "player2": {
            "name": tr(match.player2.name),
            "ranking": match.player2.ranking,
            "recent_form": results(match_queries.recent_results(match.player2)),
            "form_stats": match_queries.form_stats(match.player2),
        },
        "head_to_head": results(match_queries.head_to_head(match.player1, match.player2)),
    }


def _mock_analysis(context: dict, language: str) -> TennisAnalysis:
    p1 = context["fixture"]["player1"]
    p2 = context["fixture"]["player2"]
    if language == "he":
        summary = (
            f"[מדומה] ניתוח לדוגמה לקראת {p1} מול {p2}. "
            "זהו טקסט קבוע מראש לצורכי פיתוח — לא בוצעה קריאה אמיתית ל-Claude. "
            "עברו למצב live (AI_AGENT_MODE=live) עם מפתח API תקין לקבלת ניתוח אמיתי."
        )
        key_factors = [
            "[מדומה] גורם מפתח לדוגמה מספר אחד",
            "[מדומה] גורם מפתח לדוגמה מספר שתיים",
            "[מדומה] גורם מפתח לדוגמה מספר שלוש",
        ]
    else:
        summary = (
            f"[Mock] Simulated pre-match analysis for {p1} vs {p2}. "
            "This is fixed placeholder text for development — no real Claude API call "
            "was made. Set AI_AGENT_MODE=live with a valid ANTHROPIC_API_KEY for real analysis."
        )
        key_factors = [
            "[Mock] Placeholder key factor one",
            "[Mock] Placeholder key factor two",
            "[Mock] Placeholder key factor three",
        ]
    return TennisAnalysis(
        summary=summary,
        key_factors=key_factors,
        probabilities=Probabilities(player1_win=55, player2_win=45),
        confidence="medium",
    )


def _normalize_probabilities(p1: int, p2: int) -> tuple[int, int]:
    total = p1 + p2
    if total <= 0:
        return 50, 50
    scaled = [round(v * 100 / total) for v in (p1, p2)]
    remainder = 100 - sum(scaled)
    scaled[scaled.index(max(scaled))] += remainder
    return scaled[0], scaled[1]


def get_or_create_analysis(match: TennisMatch, language: str = "en") -> MatchAnalysis:
    existing = MatchAnalysis.objects.filter(match=match, language=language).first()
    if existing:
        return existing

    context = _build_match_context(match, language)

    logger.info("Requesting tennis analysis for match %s (lang=%s)", match.id, language)
    analysis, model_label = call_agent(
        output_format=TennisAnalysis,
        system=SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS.get(language, ""),
        context=context,
        mock_factory=lambda ctx: _mock_analysis(ctx, language),
    )

    p1, p2 = _normalize_probabilities(
        analysis.probabilities.player1_win,
        analysis.probabilities.player2_win,
    )

    return MatchAnalysis.objects.create(
        match=match,
        language=language,
        summary=analysis.summary,
        key_factors=analysis.key_factors,
        player1_win_pct=p1,
        player2_win_pct=p2,
        confidence=analysis.confidence,
        model=model_label,
    )
