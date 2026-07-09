"""Query helpers shared by the API views and the Tennis Agent — the tennis
analogue of games/services.py, but keyed on a player rather than a team since
tennis matches are player-vs-player, not team-vs-team."""

from django.db.models import Q

from .models import TennisMatch, TennisPlayer


def recent_results(player: TennisPlayer, limit: int = 5):
    return (
        TennisMatch.objects.filter(Q(player1=player) | Q(player2=player), status=TennisMatch.Status.FINISHED)
        .select_related("player1", "player2")
        .order_by("-start_time")[:limit]
    )


def head_to_head(player_a: TennisPlayer, player_b: TennisPlayer, limit: int = 5):
    return (
        TennisMatch.objects.filter(
            Q(player1=player_a, player2=player_b) | Q(player1=player_b, player2=player_a),
            status=TennisMatch.Status.FINISHED,
        )
        .select_related("player1", "player2")
        .order_by("-start_time")[:limit]
    )


def form_stats(player: TennisPlayer, limit: int = 5) -> dict:
    stats = {"played": 0, "wins": 0, "losses": 0}
    for match in recent_results(player, limit):
        stats["played"] += 1
        if match.winner_id == player.id:
            stats["wins"] += 1
        else:
            stats["losses"] += 1
    return stats
