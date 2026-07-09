from django.db import models


class MatchAnalysis(models.Model):
    """Persisted Tennis Agent output — one row per match per language."""

    match = models.ForeignKey(
        "tennis.TennisMatch", on_delete=models.CASCADE, related_name="analyses"
    )
    language = models.CharField(max_length=5, default="en")
    summary = models.TextField()
    key_factors = models.JSONField(default=list)
    player1_win_pct = models.PositiveSmallIntegerField()
    player2_win_pct = models.PositiveSmallIntegerField()
    confidence = models.CharField(max_length=10)
    model = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "tennis match analyses"
        constraints = [
            models.UniqueConstraint(fields=["match", "language"], name="one_tennis_analysis_per_match_language"),
        ]

    def __str__(self):
        return f"Tennis analysis for {self.match} [{self.language}]"
