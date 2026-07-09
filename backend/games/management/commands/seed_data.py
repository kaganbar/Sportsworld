"""Seed the database with mock football data (Phase 1 — no real sports API yet).

Idempotent: wipes and recreates the mock data every run, so re-running after a
model change is safe. Usage: python manage.py seed_data
"""

import datetime
import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from football_agent.models import MatchAnalysis
from games.models import Game, Injury, Lineup, MatchResult, Player, Team

TEAMS = [
    # name, short, country, color
    ("Real Madrid", "RMA", "Spain", "#FEBE10"),
    ("FC Barcelona", "BAR", "Spain", "#A50044"),
    ("Manchester City", "MCI", "England", "#6CABDD"),
    ("Liverpool", "LIV", "England", "#C8102E"),
    ("Bayern Munich", "BAY", "Germany", "#DC052D"),
    ("Paris Saint-Germain", "PSG", "France", "#004170"),
]

# 15 players per team: 2 GK, 5 DF, 5 MF, 3 FW (fictional-ish names to keep it simple)
SQUAD_TEMPLATE = ["GK"] * 2 + ["DF"] * 5 + ["MF"] * 5 + ["FW"] * 3

FIRST_NAMES = [
    "Marco", "Luka", "Kylian", "Erling", "Jude", "Pedri", "Vini", "Rodri",
    "Thibaut", "Alisson", "Virgil", "Joshua", "Leroy", "Ousmane", "Federico",
    "Eduardo", "Dani", "Ferland", "Aurelien", "Toni", "Harry", "Phil",
]
LAST_NAMES = [
    "Silva", "Fernandez", "Muller", "Diaz", "Martinez", "Costa", "Moreira",
    "Vega", "Kovac", "Dubois", "Schmidt", "Rossi", "Almeida", "Laurent",
    "Weber", "Navarro", "Klein", "Marchetti", "Duarte", "Fontaine",
]

INJURY_REASONS = [
    ("out", "Hamstring tear"),
    ("out", "Knee ligament injury"),
    ("doubtful", "Ankle knock"),
    ("doubtful", "Muscle fatigue"),
    ("suspended", "Accumulated yellow cards"),
]

TODAYS_FIXTURES = [
    # home, away, competition, venue, hour (local)
    ("RMA", "BAR", "La Liga", "Santiago Bernabeu", 21),
    ("MCI", "LIV", "Premier League", "Etihad Stadium", 18),
    ("BAY", "PSG", "Champions League", "Allianz Arena", 20),
]


class Command(BaseCommand):
    help = "Seed the database with mock teams, players, fixtures, results, and injuries."

    def handle(self, *args, **options):
        rng = random.Random(42)  # deterministic seed data across runs

        MatchAnalysis.objects.all().delete()
        Lineup.objects.all().delete()
        Game.objects.all().delete()
        MatchResult.objects.all().delete()
        Injury.objects.all().delete()
        Player.objects.all().delete()
        Team.objects.all().delete()

        teams: dict[str, Team] = {}
        for name, short, country, color in TEAMS:
            teams[short] = Team.objects.create(
                name=name, short_name=short, country=country, primary_color=color
            )

        players: dict[str, list[Player]] = {short: [] for short in teams}
        for short, team in teams.items():
            used_names: set[str] = set()
            for i, position in enumerate(SQUAD_TEMPLATE, start=1):
                while True:
                    name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
                    if name not in used_names:
                        used_names.add(name)
                        break
                players[short].append(
                    Player.objects.create(
                        team=team, name=name, position=position, shirt_number=i
                    )
                )

        today = timezone.localdate()
        shorts = list(teams)

        # Past results: 5 per team against random other seeded teams, spread over
        # the last 10 weeks. Guarantees H2H history for today's fixture pairs too.
        for a_short, b_short, *_ in TODAYS_FIXTURES:
            for weeks_ago in (3, 9):  # two prior meetings per fixture pair
                h2h_home = rng.choice([a_short, b_short])
                h2h_away = b_short if h2h_home == a_short else a_short
                MatchResult.objects.create(
                    date=today - datetime.timedelta(weeks=weeks_ago),
                    competition="La Liga" if {a_short, b_short} == {"RMA", "BAR"} else "Friendly",
                    home_team=teams[h2h_home],
                    away_team=teams[h2h_away],
                    home_score=rng.randint(0, 4),
                    away_score=rng.randint(0, 3),
                )

        for short in shorts:
            for i in range(5):
                opponent = rng.choice([s for s in shorts if s != short])
                is_home = rng.random() < 0.5
                MatchResult.objects.create(
                    date=today - datetime.timedelta(days=7 * (i + 1) + rng.randint(0, 3)),
                    competition=rng.choice(["League", "Cup", "Champions League"]),
                    home_team=teams[short] if is_home else teams[opponent],
                    away_team=teams[opponent] if is_home else teams[short],
                    home_score=rng.randint(0, 4),
                    away_score=rng.randint(0, 3),
                )

        # Injuries: 2-3 per team
        for short, team in teams.items():
            for player in rng.sample(players[short], rng.randint(2, 3)):
                injury_status, reason = rng.choice(INJURY_REASONS)
                Injury.objects.create(player=player, team=team, status=injury_status, reason=reason)

        # Today's fixtures + starting XIs (skipping injured 'out' players)
        for home_short, away_short, competition, venue, hour in TODAYS_FIXTURES:
            kickoff = timezone.make_aware(
                datetime.datetime.combine(today, datetime.time(hour=hour))
            )
            game = Game.objects.create(
                competition=competition,
                kickoff=kickoff,
                venue=venue,
                status=Game.Status.SCHEDULED,
                home_team=teams[home_short],
                away_team=teams[away_short],
            )
            for short in (home_short, away_short):
                out_ids = {
                    i.player_id
                    for i in Injury.objects.filter(team=teams[short], status="out")
                }
                available = [p for p in players[short] if p.id not in out_ids]
                # starting XI: 1 GK, then best-effort 4-4-2 from remaining
                gk = next(p for p in available if p.position == "GK")
                outfield = [p for p in available if p.position != "GK"][:10]
                for p in [gk, *outfield]:
                    Lineup.objects.create(
                        game=game, team=teams[short], player=p,
                        is_starting=True, position=p.position,
                    )
                bench = [p for p in available if p != gk and p not in outfield][:5]
                for p in bench:
                    Lineup.objects.create(
                        game=game, team=teams[short], player=p,
                        is_starting=False, position=p.position,
                    )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Team.objects.count()} teams, {Player.objects.count()} players, "
            f"{Game.objects.count()} games today, {MatchResult.objects.count()} past results, "
            f"{Injury.objects.count()} injuries."
        ))
