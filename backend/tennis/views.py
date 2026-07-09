from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from translations.service import resolve_lang

from . import services
from .models import TennisMatch
from .serializers import TennisMatchListSerializer, TennisMatchResultSerializer, TennisSetSerializer


@api_view(["GET"])
def matches_today(request):
    today = timezone.localdate()
    lang = resolve_lang(request)
    matches = (
        TennisMatch.objects.filter(start_time__date=today)
        .select_related("player1", "player2")
        .order_by("start_time")
    )
    return Response(TennisMatchListSerializer(matches, many=True, context={"lang": lang}).data)


@api_view(["GET"])
def match_detail(request, match_id: int):
    match = get_object_or_404(
        TennisMatch.objects.select_related("player1", "player2"), pk=match_id
    )
    lang = resolve_lang(request)
    ctx = {"lang": lang}

    return Response({
        "match": TennisMatchListSerializer(match, context=ctx).data,
        "sets": TennisSetSerializer(match.sets.all(), many=True).data,
        "stats": {
            "player1": services.form_stats(match.player1),
            "player2": services.form_stats(match.player2),
        },
        "recent_form": {
            "player1": TennisMatchResultSerializer(services.recent_results(match.player1), many=True, context=ctx).data,
            "player2": TennisMatchResultSerializer(services.recent_results(match.player2), many=True, context=ctx).data,
        },
        "head_to_head": TennisMatchResultSerializer(
            services.head_to_head(match.player1, match.player2), many=True, context=ctx
        ).data,
    })
