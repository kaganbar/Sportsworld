from rest_framework import serializers

from .models import TennisMatch, TennisPlayer, TennisSet


class TennisPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TennisPlayer
        fields = ["id", "name", "country", "tour", "ranking"]


class TennisSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = TennisSet
        fields = ["set_number", "player1_games", "player2_games"]


class TennisMatchListSerializer(serializers.ModelSerializer):
    player1 = TennisPlayerSerializer()
    player2 = TennisPlayerSerializer()

    class Meta:
        model = TennisMatch
        fields = [
            "id", "tour", "tournament", "round", "venue", "start_time", "status",
            "player1", "player2", "winner_id",
        ]


class TennisMatchResultSerializer(serializers.ModelSerializer):
    """A finished match rendered as a compact result row for recent-form/H2H lists."""

    player1 = serializers.CharField(source="player1.name")
    player2 = serializers.CharField(source="player2.name")
    winner = serializers.CharField(source="winner.name", allow_null=True)
    sets = TennisSetSerializer(many=True)

    class Meta:
        model = TennisMatch
        fields = ["start_time", "tournament", "round", "player1", "player2", "winner", "sets"]
