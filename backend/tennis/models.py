from django.db import models

TOUR_CHOICES = [
    ("atp", "ATP"),
    ("wta", "WTA"),
]


class TennisPlayer(models.Model):
    name = models.CharField(max_length=100, unique=True)
    country = models.CharField(max_length=50)
    tour = models.CharField(max_length=3, choices=TOUR_CHOICES)
    ranking = models.PositiveSmallIntegerField(null=True, blank=True)

    def __str__(self):
        return self.name


class TennisMatch(models.Model):
    """Doubles as both an upcoming/live fixture and, once finished, a historical
    record — recent form and head-to-head are derived by querying finished
    matches for a player, the same pattern games.MatchResult uses for teams."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled"
        LIVE = "live"
        FINISHED = "finished"

    tour = models.CharField(max_length=3, choices=TOUR_CHOICES)
    tournament = models.CharField(max_length=100)
    round = models.CharField(max_length=10)  # e.g. R32, R16, QF, SF, F
    venue = models.CharField(max_length=100)
    start_time = models.DateTimeField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    player1 = models.ForeignKey(TennisPlayer, on_delete=models.CASCADE, related_name="matches_as_p1")
    player2 = models.ForeignKey(TennisPlayer, on_delete=models.CASCADE, related_name="matches_as_p2")
    winner = models.ForeignKey(
        TennisPlayer, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    def __str__(self):
        return f"{self.player1} vs {self.player2} ({self.tournament} {self.round})"


class TennisSet(models.Model):
    match = models.ForeignKey(TennisMatch, on_delete=models.CASCADE, related_name="sets")
    set_number = models.PositiveSmallIntegerField()
    player1_games = models.PositiveSmallIntegerField()
    player2_games = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = [("match", "set_number")]
        ordering = ["set_number"]

    def __str__(self):
        return f"Set {self.set_number}: {self.player1_games}-{self.player2_games}"
