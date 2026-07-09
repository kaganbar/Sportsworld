from django.db import models


class MatchAnalysis(models.Model):
    """Persisted Football Agent output — the Claude call happens once per game
    per language; every later viewer reads this row."""

    game = models.ForeignKey("games.Game", on_delete=models.CASCADE, related_name="analyses")
    language = models.CharField(max_length=5, default="en")
    summary = models.TextField()
    key_factors = models.JSONField(default=list)
    home_win_pct = models.PositiveSmallIntegerField()
    draw_pct = models.PositiveSmallIntegerField()
    away_win_pct = models.PositiveSmallIntegerField()
    confidence = models.CharField(max_length=10)
    model = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "match analyses"
        constraints = [
            models.UniqueConstraint(fields=["game", "language"], name="one_analysis_per_game_language"),
        ]

    def __str__(self):
        return f"Analysis for {self.game} [{self.language}]"
