from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from games.models import Game

from .services import AnalysisUnavailable, get_or_create_analysis


@api_view(["GET"])
def game_analysis(request, game_id: int):
    game = get_object_or_404(
        Game.objects.select_related("home_team", "away_team"), pk=game_id, sport="basketball"
    )
    language = request.query_params.get("lang", "en")
    if language not in ("en", "he"):
        return Response({"detail": "Unsupported language."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        analysis = get_or_create_analysis(game, language)
    except AnalysisUnavailable as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({
        "language": analysis.language,
        "summary": analysis.summary,
        "key_factors": analysis.key_factors,
        "probabilities": {
            "home_win": analysis.home_win_pct,
            "away_win": analysis.away_win_pct,
        },
        "confidence": analysis.confidence,
        "model": analysis.model,
        "created_at": analysis.created_at,
    })
