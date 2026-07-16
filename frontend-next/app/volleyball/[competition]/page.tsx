"use client";

import TeamSportCompetitionHub from "@/components/team-sport-competition-hub";
import { fetchVolleyballGames } from "@/lib/api";

export default function VolleyballCompetitionHub({ params }: { params: { competition: string } }) {
  return <TeamSportCompetitionHub sport="volleyball" competition={params.competition} fetchGames={fetchVolleyballGames} />;
}
