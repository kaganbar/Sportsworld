"use client";

import TeamSportGameDetail from "@/components/team-sport-game-detail";
import { BaseballGameDetail, fetchBaseballAnalysis, fetchBaseballGameDetail } from "@/lib/api";
import { BASEBALL_STAT_ROWS } from "@/theme/statSchema";

export default function BaseballGamePage({ params }: { params: { id: string } }) {
  return (
    <TeamSportGameDetail<BaseballGameDetail, Awaited<ReturnType<typeof fetchBaseballAnalysis>>>
      id={params.id}
      sport="baseball"
      fetchDetail={fetchBaseballGameDetail}
      fetchAnalysis={fetchBaseballAnalysis}
      statRows={BASEBALL_STAT_ROWS}
      periodsTitleKey="innings"
      periods={(data) => data.innings.map((i) => ({ key: i.inning, label: String(i.inning), home_score: i.home_score, away_score: i.away_score }))}
      mergeTick={(prev, payload) => {
        const innings = [...prev.innings];
        const idx = innings.findIndex((i) => i.inning === payload.inning);
        const updatedInning = {
          inning: payload.inning,
          home_score: payload.inning_home_score,
          away_score: payload.inning_away_score,
        };
        if (idx >= 0) innings[idx] = updatedInning;
        else innings.push(updatedInning);
        return {
          ...prev,
          game: {
            ...prev.game,
            home_score: payload.home_score,
            away_score: payload.away_score,
            status: payload.status ?? prev.game.status,
          },
          innings,
        };
      }}
    />
  );
}
