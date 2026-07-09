"""Query helpers shared by the API views and the Football Agent."""

from django.db.models import Q

from .models import MatchResult, Team


def recent_results(team: Team, limit: int = 5):
    return MatchResult.objects.filter(
        Q(home_team=team) | Q(away_team=team)
    ).select_related("home_team", "away_team")[:limit]


def head_to_head(team_a: Team, team_b: Team, limit: int = 5):
    return MatchResult.objects.filter(
        Q(home_team=team_a, away_team=team_b) | Q(home_team=team_b, away_team=team_a)
    ).select_related("home_team", "away_team")[:limit]


def form_stats(team: Team, limit: int = 5) -> dict:
    """Aggregate W/D/L and goals over the team's last `limit` results."""
    stats = {"played": 0, "wins": 0, "draws": 0, "losses": 0, "goals_for": 0, "goals_against": 0}
    for result in recent_results(team, limit):
        is_home = result.home_team_id == team.id
        scored = result.home_score if is_home else result.away_score
        conceded = result.away_score if is_home else result.home_score
        stats["played"] += 1
        stats["goals_for"] += scored
        stats["goals_against"] += conceded
        if scored > conceded:
            stats["wins"] += 1
        elif scored == conceded:
            stats["draws"] += 1
        else:
            stats["losses"] += 1
    return stats
