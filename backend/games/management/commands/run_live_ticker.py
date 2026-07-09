"""Ticks simulated live score/state changes for every game/match with
status="live", broadcasting each change over the Channels layer so connected
frontend WebSocket clients see it without polling or refreshing.

Runs as its own long-lived container service (see docker-compose.yml) rather
than inside the request/response cycle. Deliberately synchronous (not an
asyncio loop) — asgiref.sync.async_to_sync is the standard bridge for plain
sync code pushing into a channel layer, and there's no need for async ORM
calls here since this process does nothing else while it sleeps.

Usage: python manage.py run_live_ticker
"""

import random
import time

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.management.base import BaseCommand
from django.db.models import Sum

from basketball.models import QuarterScore
from games.models import Game
from tennis.models import TennisMatch

TICK_SECONDS = 4
MAX_QUARTERS = 4


class Command(BaseCommand):
    help = "Ticks simulated live state for status=live games/matches every few seconds."

    def handle(self, *args, **options):
        channel_layer = get_channel_layer()
        rng = random.Random()  # not seeded — this is the live simulation, not deterministic mock data
        self.stdout.write(self.style.SUCCESS(f"Live ticker started (every {TICK_SECONDS}s, Ctrl+C to stop)"))
        while True:
            time.sleep(TICK_SECONDS)
            self._tick_football(rng, channel_layer)
            self._tick_basketball(rng, channel_layer)
            self._tick_tennis(rng, channel_layer)

    def _tick_football(self, rng, channel_layer):
        for game in Game.objects.filter(sport="football", status="live"):
            game.minute = (game.minute or 0) + 1
            event = None
            roll = rng.random()
            if roll < 0.10:
                side = rng.choice(["home", "away"])
                if side == "home":
                    game.home_score = (game.home_score or 0) + 1
                else:
                    game.away_score = (game.away_score or 0) + 1
                event = {"type": "goal", "team": side, "minute": game.minute}
            elif roll < 0.15:
                side = rng.choice(["home", "away"])
                event = {"type": "card", "team": side, "minute": game.minute, "card": rng.choice(["yellow", "red"])}

            if game.minute >= 90:
                game.status = Game.Status.FINISHED
            game.save(update_fields=["minute", "home_score", "away_score", "status"])

            self._send(channel_layer, f"game-football-{game.id}", {
                "minute": game.minute,
                "home_score": game.home_score,
                "away_score": game.away_score,
                "status": game.status,
                "event": event,
            })

    def _tick_basketball(self, rng, channel_layer):
        for game in Game.objects.filter(sport="basketball", status="live"):
            latest = game.quarter_scores.order_by("-quarter").first()
            if latest is None:
                continue

            event = None
            if rng.random() < 0.4:
                side = rng.choice(["home", "away"])
                points = rng.choice([2, 2, 3])
                if side == "home":
                    latest.home_score += points
                else:
                    latest.away_score += points
                latest.save(update_fields=["home_score", "away_score"])
                event = {"type": "basket", "team": side, "points": points}

            finished = False
            if latest.quarter < MAX_QUARTERS and rng.random() < 0.05:
                latest = QuarterScore.objects.create(
                    game=game, quarter=latest.quarter + 1, home_score=0, away_score=0
                )
            elif latest.quarter == MAX_QUARTERS and (latest.home_score + latest.away_score) >= 40:
                finished = True

            totals = game.quarter_scores.aggregate(home=Sum("home_score"), away=Sum("away_score"))
            game.home_score = totals["home"] or 0
            game.away_score = totals["away"] or 0
            if finished:
                game.status = Game.Status.FINISHED
            game.save(update_fields=["home_score", "away_score", "status"])

            self._send(channel_layer, f"game-basketball-{game.id}", {
                "home_score": game.home_score,
                "away_score": game.away_score,
                "quarter": latest.quarter,
                "quarter_home_score": latest.home_score,
                "quarter_away_score": latest.away_score,
                "status": game.status,
                "event": event,
            })

    def _tick_tennis(self, rng, channel_layer):
        for match in TennisMatch.objects.filter(status="live"):
            current = match.sets.order_by("-set_number").first()
            if current is None:
                continue
            if rng.random() < 0.3:
                if rng.random() < 0.5:
                    current.player1_games += 1
                else:
                    current.player2_games += 1
                current.save(update_fields=["player1_games", "player2_games"])

            # Simple set-won check (ignores tiebreak nuance — good enough for a
            # simulated demo): first to 6+ games with a 2-game lead wins the set.
            p1, p2 = current.player1_games, current.player2_games
            if max(p1, p2) >= 6 and abs(p1 - p2) >= 2:
                match.status = TennisMatch.Status.FINISHED
                match.winner = match.player1 if p1 > p2 else match.player2
                match.save(update_fields=["status", "winner"])

            self._send(channel_layer, f"match-tennis-{match.id}", {
                "set_number": current.set_number,
                "player1_games": current.player1_games,
                "player2_games": current.player2_games,
                "status": match.status,
            })

    def _send(self, channel_layer, group_name, payload):
        async_to_sync(channel_layer.group_send)(group_name, {"type": "game.tick", "payload": payload})
