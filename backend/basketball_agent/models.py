from django.db import models


class MatchAnalysis(models.Model):
    """Persisted Basketball Agent output — one row per game per language,
    mirroring football_agent.MatchAnalysis but with no draw probability
    (basketball games don't end in a tie)."""

    game = models.ForeignKey("games.Game", on_delete=models.CASCADE, related_name="basketball_analyses")
    language = models.CharField(max_length=5, default="en")
    summary = models.TextField()
    key_factors = models.JSONField(default=list)
    home_win_pct = models.PositiveSmallIntegerField()
    away_win_pct = models.PositiveSmallIntegerField()
    confidence = models.CharField(max_length=10)
    model = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "basketball match analyses"
        constraints = [
            models.UniqueConstraint(fields=["game", "language"], name="one_bball_analysis_per_game_language"),
        ]

    def __str__(self):
        return f"Basketball analysis for {self.game} [{self.language}]"
