from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from games import services as game_queries
from games.models import Game
from games.serializers import (
    GameListSerializer,
    InjurySerializer,
    LineupEntrySerializer,
    MatchResultSerializer,
)
from translations.service import resolve_lang

from .models import QuarterScore
from .serializers import QuarterScoreSerializer


@api_view(["GET"])
def games_today(request):
    today = timezone.localdate()
    lang = resolve_lang(request)
    games = (
        Game.objects.filter(kickoff__date=today, sport="basketball")
        .select_related("home_team", "away_team")
        .order_by("kickoff")
    )
    return Response(GameListSerializer(games, many=True, context={"lang": lang}).data)


@api_view(["GET"])
def game_detail(request, game_id: int):
    game = get_object_or_404(
        Game.objects.select_related("home_team", "away_team"), pk=game_id, sport="basketball"
    )
    lang = resolve_lang(request)
    ctx = {"lang": lang}

    lineups = game.lineups.select_related("player").order_by("-is_starting", "position")
    home_lineup = [l for l in lineups if l.team_id == game.home_team_id]
    away_lineup = [l for l in lineups if l.team_id == game.away_team_id]

    return Response({
        "game": GameListSerializer(game, context=ctx).data,
        "quarters": QuarterScoreSerializer(game.quarter_scores.all(), many=True).data,
        "lineups": {
            "home": LineupEntrySerializer(home_lineup, many=True, context=ctx).data,
            "away": LineupEntrySerializer(away_lineup, many=True, context=ctx).data,
        },
        "stats": {
            "home": game_queries.form_stats(game.home_team),
            "away": game_queries.form_stats(game.away_team),
        },
        "recent_form": {
            "home": MatchResultSerializer(game_queries.recent_results(game.home_team), many=True, context=ctx).data,
            "away": MatchResultSerializer(game_queries.recent_results(game.away_team), many=True, context=ctx).data,
        },
        "head_to_head": MatchResultSerializer(
            game_queries.head_to_head(game.home_team, game.away_team), many=True, context=ctx
        ).data,
        "injuries": {
            "home": InjurySerializer(game.home_team.injuries.select_related("player"), many=True, context=ctx).data,
            "away": InjurySerializer(game.away_team.injuries.select_related("player"), many=True, context=ctx).data,
        },
    })
