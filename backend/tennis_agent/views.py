from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from tennis.models import TennisMatch

from .services import AnalysisUnavailable, get_or_create_analysis


@api_view(["GET"])
def match_analysis(request, match_id: int):
    match = get_object_or_404(
        TennisMatch.objects.select_related("player1", "player2"), pk=match_id
    )
    language = request.query_params.get("lang", "en")
    if language not in ("en", "he"):
        return Response({"detail": "Unsupported language."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        analysis = get_or_create_analysis(match, language)
    except AnalysisUnavailable as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({
        "language": analysis.language,
        "summary": analysis.summary,
        "key_factors": analysis.key_factors,
        "probabilities": {
            "player1_win": analysis.player1_win_pct,
            "player2_win": analysis.player2_win_pct,
        },
        "confidence": analysis.confidence,
        "model": analysis.model,
        "created_at": analysis.created_at,
    })
