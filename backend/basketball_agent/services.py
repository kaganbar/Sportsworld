import logging

from ai_common.service import AnalysisUnavailable, call_agent
from games import services as game_queries
from games.models import Game
from translations.service import translate

from .models import MatchAnalysis
from .schemas import BasketballAnalysis, Probabilities

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the SportsWorld Basketball Agent, a professional basketball
match analyst. You receive structured pre-match context as JSON: the fixture, each
team's recent form, current injuries, and the head-to-head history between the two
sides.

Write an insightful pre-match analysis grounded ONLY in the data provided — do not
invent players, results, or facts that are not in the context. Assess which team
arrives in better shape and why, weigh the impact of injuries, and factor in the
head-to-head record. Basketball games cannot end in a draw.

Your two probabilities (home win, away win) must be integers that sum to exactly 100."""

LANGUAGE_INSTRUCTIONS = {
    "en": "",
    "he": "\n\nWrite the summary and key_factors in Hebrew (עברית). Use the Hebrew team and player names exactly as given in the context — do not use English/Latin spellings.",
}


def _build_match_context(game: Game, language: str = "en") -> dict:
    def tr(text):
        return translate(text, language)

    def results(qs):
        return [
            {
                "date": str(r.date),
                "competition": tr(r.competition),
                "home_team": tr(r.home_team.name),
                "away_team": tr(r.away_team.name),
                "score": f"{r.home_score}-{r.away_score}",
            }
            for r in qs
        ]

    def injuries(team):
        return [
            {"player": tr(i.player.name), "position": i.player.position, "status": i.status, "reason": i.reason}
            for i in team.injuries.select_related("player")
        ]

    return {
        "fixture": {
            "competition": tr(game.competition),
            "kickoff": game.kickoff.isoformat(),
            "venue": tr(game.venue),
            "home_team": tr(game.home_team.name),
            "away_team": tr(game.away_team.name),
        },
        "home_team": {
            "name": tr(game.home_team.name),
            "recent_form": results(game_queries.recent_results(game.home_team)),
            "form_stats": game_queries.form_stats(game.home_team),
            "injuries": injuries(game.home_team),
        },
        "away_team": {
            "name": tr(game.away_team.name),
            "recent_form": results(game_queries.recent_results(game.away_team)),
            "form_stats": game_queries.form_stats(game.away_team),
            "injuries": injuries(game.away_team),
        },
        "head_to_head": results(game_queries.head_to_head(game.home_team, game.away_team)),
    }


def _mock_analysis(context: dict, language: str) -> BasketballAnalysis:
    home = context["fixture"]["home_team"]
    away = context["fixture"]["away_team"]
    if language == "he":
        summary = (
            f"[מדומה] ניתוח לדוגמה לקראת {home} מול {away}. "
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
            f"[Mock] Simulated pre-match analysis for {home} vs {away}. "
            "This is fixed placeholder text for development — no real Claude API call "
            "was made. Set AI_AGENT_MODE=live with a valid ANTHROPIC_API_KEY for real analysis."
        )
        key_factors = [
            "[Mock] Placeholder key factor one",
            "[Mock] Placeholder key factor two",
            "[Mock] Placeholder key factor three",
        ]
    return BasketballAnalysis(
        summary=summary,
        key_factors=key_factors,
        probabilities=Probabilities(home_win=55, away_win=45),
        confidence="medium",
    )


def _normalize_probabilities(home: int, away: int) -> tuple[int, int]:
    total = home + away
    if total <= 0:
        return 50, 50
    scaled = [round(v * 100 / total) for v in (home, away)]
    remainder = 100 - sum(scaled)
    scaled[scaled.index(max(scaled))] += remainder
    return scaled[0], scaled[1]


def get_or_create_analysis(game: Game, language: str = "en") -> MatchAnalysis:
    existing = MatchAnalysis.objects.filter(game=game, language=language).first()
    if existing:
        return existing

    context = _build_match_context(game, language)

    logger.info("Requesting basketball analysis for game %s (%s, lang=%s)", game.id, game, language)
    analysis, model_label = call_agent(
        output_format=BasketballAnalysis,
        system=SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS.get(language, ""),
        context=context,
        mock_factory=lambda ctx: _mock_analysis(ctx, language),
    )

    home, away = _normalize_probabilities(
        analysis.probabilities.home_win,
        analysis.probabilities.away_win,
    )

    return MatchAnalysis.objects.create(
        game=game,
        language=language,
        summary=analysis.summary,
        key_factors=analysis.key_factors,
        home_win_pct=home,
        away_win_pct=away,
        confidence=analysis.confidence,
        model=model_label,
    )
