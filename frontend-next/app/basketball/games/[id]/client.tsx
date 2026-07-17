"use client";

import TeamSportGameDetail from "@/components/team-sport-game-detail";
import { BasketballGameDetail, fetchBasketballAnalysis, fetchBasketballGameDetail } from "@/lib/api";
import { BASKETBALL_STAT_ROWS } from "@/theme/statSchema";

export default function BasketballGamePage({ params }: { params: { id: string } }) {
  return (
    <TeamSportGameDetail<BasketballGameDetail, Awaited<ReturnType<typeof fetchBasketballAnalysis>>>
      id={params.id}
      sport="basketball"
      fetchDetail={fetchBasketballGameDetail}
      fetchAnalysis={fetchBasketballAnalysis}
      statRows={BASKETBALL_STAT_ROWS}
      periodsTitleKey="quarters"
      periods={(data) => data.quarters.map((q) => ({ key: q.quarter, label: `Q${q.quarter}`, home_score: q.home_score, away_score: q.away_score }))}
      mergeTick={(prev, payload) => {
        const quarters = [...prev.quarters];
        const idx = quarters.findIndex((q) => q.quarter === payload.quarter);
        const updatedQuarter = {
          quarter: payload.quarter,
          home_score: payload.quarter_home_score,
          away_score: payload.quarter_away_score,
        };
        if (idx >= 0) quarters[idx] = updatedQuarter;
        else quarters.push(updatedQuarter);
        return {
          ...prev,
          game: {
            ...prev.game,
            home_score: payload.home_score,
            away_score: payload.away_score,
            status: payload.status ?? prev.game.status,
          },
          quarters,
        };
      }}
    />
  );
}
