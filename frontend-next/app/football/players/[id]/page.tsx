"use client";

import TeamSportPlayerProfile from "@/components/team-sport-player-profile";
import { FootballSeasonStats } from "@/lib/api";

export default function FootballPlayerProfile({ params }: { params: { id: string } }) {
  return (
    <TeamSportPlayerProfile<FootballSeasonStats>
      id={params.id}
      sport="football"
      statRows={[
        { labelKey: "playerGoals", value: (s) => s?.goals ?? "-" },
        { labelKey: "playerAssists", value: (s) => s?.assists ?? "-" },
        { labelKey: "playerRating", value: (s) => (s?.rating != null ? s.rating.toFixed(1) : "-") },
      ]}
    />
  );
}
