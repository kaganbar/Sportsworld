"use client";

import TeamSportGameDetail from "@/components/team-sport-game-detail";
import { VolleyballGameDetail, fetchVolleyballAnalysis, fetchVolleyballGameDetail } from "@/lib/api";
import { VOLLEYBALL_STAT_ROWS } from "@/theme/statSchema";

export default function VolleyballGamePage({ params }: { params: { id: string } }) {
  return (
    <TeamSportGameDetail<VolleyballGameDetail, Awaited<ReturnType<typeof fetchVolleyballAnalysis>>>
      id={params.id}
      sport="volleyball"
      fetchDetail={fetchVolleyballGameDetail}
      fetchAnalysis={fetchVolleyballAnalysis}
      statRows={VOLLEYBALL_STAT_ROWS}
      periodsTitleKey="sets"
      periods={(data) => data.sets.map((s) => ({ key: s.set_number, label: String(s.set_number), home_score: s.home_score, away_score: s.away_score }))}
      mergeTick={(prev, payload) => {
        const sets = [...prev.sets];
        const idx = sets.findIndex((s) => s.set_number === payload.set_number);
        const updatedSet = {
          set_number: payload.set_number,
          home_score: payload.set_home_score,
          away_score: payload.set_away_score,
        };
        if (idx >= 0) sets[idx] = updatedSet;
        else sets.push(updatedSet);
        return {
          ...prev,
          game: {
            ...prev.game,
            home_score: payload.home_score,
            away_score: payload.away_score,
            status: payload.status ?? prev.game.status,
          },
          sets,
        };
      }}
    />
  );
}
