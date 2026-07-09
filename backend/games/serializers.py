from rest_framework import serializers

from .models import Game, Injury, Lineup, MatchResult, Team


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "short_name", "country", "primary_color"]


class GameListSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer()
    away_team = TeamSerializer()

    class Meta:
        model = Game
        fields = [
            "id", "competition", "kickoff", "venue", "status",
            "home_team", "away_team", "home_score", "away_score",
        ]


class LineupEntrySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="player.name")
    shirt_number = serializers.IntegerField(source="player.shirt_number")

    class Meta:
        model = Lineup
        fields = ["name", "shirt_number", "position", "is_starting"]


class MatchResultSerializer(serializers.ModelSerializer):
    home_team = serializers.CharField(source="home_team.short_name")
    away_team = serializers.CharField(source="away_team.short_name")

    class Meta:
        model = MatchResult
        fields = ["date", "competition", "home_team", "away_team", "home_score", "away_score"]


class InjurySerializer(serializers.ModelSerializer):
    player = serializers.CharField(source="player.name")

    class Meta:
        model = Injury
        fields = ["player", "status", "reason"]
