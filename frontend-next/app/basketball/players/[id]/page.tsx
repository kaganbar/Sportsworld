"use client";

import TeamSportPlayerProfile from "@/components/team-sport-player-profile";
import { BasketballSeasonStats } from "@/lib/api";

export default function BasketballPlayerProfile({ params }: { params: { id: string } }) {
  return (
    <TeamSportPlayerProfile<BasketballSeasonStats>
      id={params.id}
      sport="basketball"
      statRows={[
        { labelKey: "playerPpg", value: (s) => (s?.ppg != null ? s.ppg.toFixed(1) : "-") },
        { labelKey: "playerRpg", value: (s) => (s?.rpg != null ? s.rpg.toFixed(1) : "-") },
        { labelKey: "playerApg", value: (s) => (s?.apg != null ? s.apg.toFixed(1) : "-") },
      ]}
    />
  );
}
