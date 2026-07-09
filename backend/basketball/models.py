from django.db import models

from games.models import Game


class QuarterScore(models.Model):
    """Basketball-specific per-quarter score breakdown for a games.Game
    (sport='basketball'). Football has no equivalent — this is the one piece
    of schema that's genuinely sport-specific rather than shared core."""

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="quarter_scores")
    quarter = models.PositiveSmallIntegerField()
    home_score = models.PositiveSmallIntegerField()
    away_score = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = [("game", "quarter")]
        ordering = ["quarter"]

    def __str__(self):
        return f"{self.game} Q{self.quarter}: {self.home_score}-{self.away_score}"
