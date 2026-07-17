"use client";

import TeamSportPlayerProfile from "@/components/team-sport-player-profile";
import { VolleyballSeasonStats } from "@/lib/api";

export default function VolleyballPlayerProfile({ params }: { params: { id: string } }) {
  return (
    <TeamSportPlayerProfile<VolleyballSeasonStats>
      id={params.id}
      sport="volleyball"
      statRows={[
        { labelKey: "playerKills", value: (s) => (s?.kills != null ? s.kills.toFixed(1) : "-") },
        { labelKey: "playerDigs", value: (s) => (s?.digs != null ? s.digs.toFixed(1) : "-") },
        { labelKey: "playerBlocks", value: (s) => (s?.blocks != null ? s.blocks.toFixed(1) : "-") },
      ]}
    />
  );
}
