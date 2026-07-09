from rest_framework import serializers

from .models import QuarterScore


class QuarterScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuarterScore
        fields = ["quarter", "home_score", "away_score"]
