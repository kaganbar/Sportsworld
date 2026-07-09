from typing import Literal

from pydantic import BaseModel, Field


class Probabilities(BaseModel):
    home_win: int = Field(description="0-100 integer probability the home team wins")
    draw: int = Field(description="0-100 integer probability of a draw")
    away_win: int = Field(description="0-100 integer probability the away team wins")


class FootballAnalysis(BaseModel):
    summary: str = Field(
        description="2-4 paragraph written match analysis in a professional sports-analyst tone"
    )
    key_factors: list[str] = Field(
        description="3-6 short bullets on what is driving the prediction"
    )
    probabilities: Probabilities
    confidence: Literal["low", "medium", "high"]
