from django.db import models

SPORT_CHOICES = [
    ("football", "Football"),
    ("basketball", "Basketball"),
]


class Team(models.Model):
    sport = models.CharField(max_length=20, choices=SPORT_CHOICES, default="football")
    name = models.CharField(max_length=100, unique=True)
    short_name = models.CharField(max_length=10)
    country = models.CharField(max_length=50)
    primary_color = models.CharField(max_length=7, default="#1E7B34")

    def __str__(self):
        return self.name


class Player(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="players")
    name = models.CharField(max_length=100)
    position = models.CharField(max_length=3)  # GK, DF, MF, FW
    shirt_number = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = [("team", "shirt_number")]

    def __str__(self):
        return f"{self.name} ({self.team.short_name})"


class Game(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled"
        LIVE = "live"
        FINISHED = "finished"

    sport = models.CharField(max_length=20, choices=SPORT_CHOICES, default="football")
    competition = models.CharField(max_length=100)
    kickoff = models.DateTimeField()
    venue = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    home_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="home_games")
    away_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="away_games")
    home_score = models.PositiveSmallIntegerField(null=True, blank=True)
    away_score = models.PositiveSmallIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.home_team.short_name} vs {self.away_team.short_name} ({self.kickoff:%Y-%m-%d})"


class Lineup(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="lineups")
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    is_starting = models.BooleanField(default=True)
    position = models.CharField(max_length=3)

    class Meta:
        unique_together = [("game", "player")]


class MatchResult(models.Model):
    """A finished historical game. Powers both recent-form and head-to-head
    (H2H is derived by filtering on the two team ids — no separate table)."""

    date = models.DateField()
    competition = models.CharField(max_length=100)
    home_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="past_home_results")
    away_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="past_away_results")
    home_score = models.PositiveSmallIntegerField()
    away_score = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.home_team.short_name} {self.home_score}-{self.away_score} {self.away_team.short_name}"


class Injury(models.Model):
    class Status(models.TextChoices):
        OUT = "out"
        DOUBTFUL = "doubtful"
        SUSPENDED = "suspended"

    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="injuries")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="injuries")
    status = models.CharField(max_length=10, choices=Status.choices)
    reason = models.CharField(max_length=200)

    class Meta:
        verbose_name_plural = "injuries"

    def __str__(self):
        return f"{self.player.name}: {self.status} ({self.reason})"
