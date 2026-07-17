"use client";

import TeamSportPlayerProfile from "@/components/team-sport-player-profile";
import { BaseballSeasonStats } from "@/lib/api";

export default function BaseballPlayerProfile({ params }: { params: { id: string } }) {
  return (
    <TeamSportPlayerProfile<BaseballSeasonStats>
      id={params.id}
      sport="baseball"
      statRows={[
        { labelKey: "playerAvg", value: (s) => (s?.avg != null ? s.avg.toFixed(3) : "-") },
        { labelKey: "playerHomeRuns", value: (s) => s?.homeRuns ?? "-" },
        { labelKey: "playerRbi", value: (s) => s?.rbi ?? "-" },
      ]}
    />
  );
}
