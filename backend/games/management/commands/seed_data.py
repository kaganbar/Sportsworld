"""Seed the database with mock football, basketball, and tennis data (no real
sports API yet).

Idempotent: wipes and recreates the mock data every run, so re-running after a
model change is safe. Usage: python manage.py seed_data
"""

import datetime
import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from basketball.models import QuarterScore
from basketball_agent.models import MatchAnalysis as BasketballMatchAnalysis
from football_agent.models import MatchAnalysis as FootballMatchAnalysis
from games.models import Game, Injury, Lineup, MatchResult, Player, Team
from tennis.models import TennisMatch, TennisPlayer, TennisSet
from tennis_agent.models import MatchAnalysis as TennisMatchAnalysis

FOOTBALL_TEAMS = [
    # name, short, country, color
    ("Real Madrid", "RMA", "Spain", "#FEBE10"),
    ("FC Barcelona", "BAR", "Spain", "#A50044"),
    ("Manchester City", "MCI", "England", "#6CABDD"),
    ("Liverpool", "LIV", "England", "#C8102E"),
    ("Bayern Munich", "BAY", "Germany", "#DC052D"),
    ("Paris Saint-Germain", "PSG", "France", "#004170"),
]

# 15 players per team: 2 GK, 5 DF, 5 MF, 3 FW (fictional-ish names to keep it simple)
FOOTBALL_SQUAD_TEMPLATE = ["GK"] * 2 + ["DF"] * 5 + ["MF"] * 5 + ["FW"] * 3

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

FOOTBALL_TODAYS_FIXTURES = [
    # home, away, competition, venue, hour (local)
    ("RMA", "BAR", "La Liga", "Santiago Bernabeu", 21),
    ("MCI", "LIV", "Premier League", "Etihad Stadium", 18),
    ("BAY", "PSG", "Champions League", "Allianz Arena", 20),
]

BASKETBALL_TEAMS = [
    ("Los Angeles Lakers", "LAL", "USA", "#552583"),
    ("Boston Celtics", "BOS", "USA", "#007A33"),
    ("Golden State Warriors", "GSW", "USA", "#1D428A"),
    ("Miami Heat", "MIA", "USA", "#98002E"),
]

# 10 players per team: 2 per position
BASKETBALL_SQUAD_TEMPLATE = ["PG"] * 2 + ["SG"] * 2 + ["SF"] * 2 + ["PF"] * 2 + ["C"] * 2

# home, away, competition, venue, hour, status ("live" games also get quarter scores)
BASKETBALL_TODAYS_FIXTURES = [
    ("LAL", "BOS", "NBA", "Crypto.com Arena", 19, "scheduled"),
    ("GSW", "MIA", "NBA", "Chase Center", 22, "live"),
]

TENNIS_PLAYERS = [
    # name, country, tour, ranking
    ("Novak Djokovic", "Serbia", "atp", 1),
    ("Carlos Alcaraz", "Spain", "atp", 2),
    ("Jannik Sinner", "Italy", "atp", 3),
    ("Daniil Medvedev", "Russia", "atp", 4),
    ("Iga Swiatek", "Poland", "wta", 1),
    ("Aryna Sabalenka", "Belarus", "wta", 2),
    ("Coco Gauff", "USA", "wta", 3),
    ("Elena Rybakina", "Kazakhstan", "wta", 4),
]

# player1, player2, tour, tournament, round, venue, hour
TENNIS_TODAYS_MATCHES = [
    ("Novak Djokovic", "Carlos Alcaraz", "atp", "Wimbledon", "SF", "Centre Court", 14),
    ("Iga Swiatek", "Aryna Sabalenka", "wta", "Wimbledon", "SF", "Centre Court", 17),
]


class Command(BaseCommand):
    help = "Seed the database with mock football, basketball, and tennis data."

    def handle(self, *args, **options):
        rng = random.Random(42)  # deterministic seed data across runs
        today = timezone.localdate()

        self._wipe()

        football_teams, football_players = self._seed_football(rng, today)
        basketball_teams, basketball_players = self._seed_basketball(rng, today)
        tennis_players = self._seed_tennis(rng, today)

        self.stdout.write(self.style.SUCCESS(
            f"Football: {len(football_teams)} teams, {sum(len(p) for p in football_players.values())} players, "
            f"{Game.objects.filter(sport='football').count()} games today.\n"
            f"Basketball: {len(basketball_teams)} teams, {sum(len(p) for p in basketball_players.values())} players, "
            f"{Game.objects.filter(sport='basketball').count()} games today.\n"
            f"Tennis: {len(tennis_players)} players, {TennisMatch.objects.filter(start_time__date=today).count()} matches today.\n"
            f"Totals: {MatchResult.objects.count()} match results, {Injury.objects.count()} injuries, "
            f"{TennisMatch.objects.count()} tennis matches."
        ))

    def _wipe(self):
        TennisMatchAnalysis.objects.all().delete()
        TennisSet.objects.all().delete()
        TennisMatch.objects.all().delete()
        TennisPlayer.objects.all().delete()
        BasketballMatchAnalysis.objects.all().delete()
        FootballMatchAnalysis.objects.all().delete()
        Lineup.objects.all().delete()
        Game.objects.all().delete()  # cascades to basketball.QuarterScore
        MatchResult.objects.all().delete()
        Injury.objects.all().delete()
        Player.objects.all().delete()
        Team.objects.all().delete()

    def _create_squad(self, rng, team, position_template):
        used_names: set[str] = set()
        roster = []
        for i, position in enumerate(position_template, start=1):
            while True:
                name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
                if name not in used_names:
                    used_names.add(name)
                    break
            roster.append(Player.objects.create(team=team, name=name, position=position, shirt_number=i))
        return roster

    def _seed_football(self, rng, today):
        teams: dict[str, Team] = {}
        for name, short, country, color in FOOTBALL_TEAMS:
            teams[short] = Team.objects.create(
                sport="football", name=name, short_name=short, country=country, primary_color=color
            )

        players: dict[str, list[Player]] = {
            short: self._create_squad(rng, team, FOOTBALL_SQUAD_TEMPLATE) for short, team in teams.items()
        }

        shorts = list(teams)

        # Past results: 5 per team against random other seeded teams, spread over
        # the last 10 weeks. Guarantees H2H history for today's fixture pairs too.
        for a_short, b_short, *_ in FOOTBALL_TODAYS_FIXTURES:
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
        for home_short, away_short, competition, venue, hour in FOOTBALL_TODAYS_FIXTURES:
            kickoff = timezone.make_aware(
                datetime.datetime.combine(today, datetime.time(hour=hour))
            )
            game = Game.objects.create(
                sport="football",
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

        return teams, players

    def _seed_basketball(self, rng, today):
        teams: dict[str, Team] = {}
        for name, short, country, color in BASKETBALL_TEAMS:
            teams[short] = Team.objects.create(
                sport="basketball", name=name, short_name=short, country=country, primary_color=color
            )

        players: dict[str, list[Player]] = {
            short: self._create_squad(rng, team, BASKETBALL_SQUAD_TEMPLATE) for short, team in teams.items()
        }

        shorts = list(teams)
        fixture_pairs = [(h, a) for h, a, *_ in BASKETBALL_TODAYS_FIXTURES]

        for a_short, b_short in fixture_pairs:
            for weeks_ago in (2, 6):
                h2h_home = rng.choice([a_short, b_short])
                h2h_away = b_short if h2h_home == a_short else a_short
                MatchResult.objects.create(
                    date=today - datetime.timedelta(weeks=weeks_ago),
                    competition="NBA",
                    home_team=teams[h2h_home],
                    away_team=teams[h2h_away],
                    home_score=rng.randint(95, 125),
                    away_score=rng.randint(95, 125),
                )

        for short in shorts:
            for i in range(5):
                opponent = rng.choice([s for s in shorts if s != short])
                is_home = rng.random() < 0.5
                MatchResult.objects.create(
                    date=today - datetime.timedelta(days=7 * (i + 1) + rng.randint(0, 3)),
                    competition="NBA",
                    home_team=teams[short] if is_home else teams[opponent],
                    away_team=teams[opponent] if is_home else teams[short],
                    home_score=rng.randint(95, 125),
                    away_score=rng.randint(95, 125),
                )

        for short, team in teams.items():
            for player in rng.sample(players[short], rng.randint(1, 2)):
                injury_status, reason = rng.choice(INJURY_REASONS)
                Injury.objects.create(player=player, team=team, status=injury_status, reason=reason)

        for home_short, away_short, competition, venue, hour, status in BASKETBALL_TODAYS_FIXTURES:
            tipoff = timezone.make_aware(
                datetime.datetime.combine(today, datetime.time(hour=hour))
            )
            game = Game.objects.create(
                sport="basketball",
                competition=competition,
                kickoff=tipoff,
                venue=venue,
                status=status,
                home_team=teams[home_short],
                away_team=teams[away_short],
            )
            for short in (home_short, away_short):
                out_ids = {
                    i.player_id
                    for i in Injury.objects.filter(team=teams[short], status="out")
                }
                available = [p for p in players[short] if p.id not in out_ids]
                starters = available[:5]
                bench = available[5:]
                for p in starters:
                    Lineup.objects.create(
                        game=game, team=teams[short], player=p,
                        is_starting=True, position=p.position,
                    )
                for p in bench:
                    Lineup.objects.create(
                        game=game, team=teams[short], player=p,
                        is_starting=False, position=p.position,
                    )

            if status == "live":
                home_total = away_total = 0
                for quarter in range(1, 4):
                    home_q, away_q = rng.randint(20, 32), rng.randint(20, 32)
                    home_total += home_q
                    away_total += away_q
                    QuarterScore.objects.create(
                        game=game, quarter=quarter, home_score=home_q, away_score=away_q,
                    )
                game.home_score, game.away_score = home_total, away_total
                game.save(update_fields=["home_score", "away_score"])

        return teams, players

    def _seed_tennis(self, rng, today):
        players: dict[str, TennisPlayer] = {}
        for name, country, tour, ranking in TENNIS_PLAYERS:
            players[name] = TennisPlayer.objects.create(
                name=name, country=country, tour=tour, ranking=ranking
            )

        names = list(players)

        def create_finished_match(p1_name, p2_name, days_ago, tournament, round_):
            p1, p2 = players[p1_name], players[p2_name]
            winner = rng.choice([p1, p2])
            match = TennisMatch.objects.create(
                tour=p1.tour,
                tournament=tournament,
                round=round_,
                venue=f"{tournament} Court",
                start_time=timezone.make_aware(
                    datetime.datetime.combine(today - datetime.timedelta(days=days_ago), datetime.time(hour=14))
                ),
                status=TennisMatch.Status.FINISHED,
                player1=p1,
                player2=p2,
                winner=winner,
            )
            num_sets = rng.choice([2, 3])
            for set_number in range(1, num_sets + 1):
                is_last = set_number == num_sets
                winner_games = 6
                loser_games = rng.randint(0, 4) if is_last else rng.randint(2, 4)
                if winner == p1:
                    p1_games, p2_games = winner_games, loser_games
                else:
                    p1_games, p2_games = loser_games, winner_games
                TennisSet.objects.create(
                    match=match, set_number=set_number, player1_games=p1_games, player2_games=p2_games,
                )
            return match

        # H2H history for today's matchups
        for p1_name, p2_name, *_ in TENNIS_TODAYS_MATCHES:
            for days_ago in (60, 200):
                create_finished_match(p1_name, p2_name, days_ago, "ATP Masters" if players[p1_name].tour == "atp" else "WTA 1000", "F")

        # General recent-form history for every seeded player
        for name in names:
            for i in range(4):
                opponent = rng.choice([n for n in names if n != name and players[n].tour == players[name].tour])
                create_finished_match(name, opponent, 14 * (i + 1) + rng.randint(0, 5), "Tour Event", rng.choice(["R32", "R16", "QF"]))

        # Today's scheduled matches
        for p1_name, p2_name, tour, tournament, round_, venue, hour in TENNIS_TODAYS_MATCHES:
            TennisMatch.objects.create(
                tour=tour,
                tournament=tournament,
                round=round_,
                venue=venue,
                start_time=timezone.make_aware(
                    datetime.datetime.combine(today, datetime.time(hour=hour))
                ),
                status=TennisMatch.Status.SCHEDULED,
                player1=players[p1_name],
                player2=players[p2_name],
            )

        return players
