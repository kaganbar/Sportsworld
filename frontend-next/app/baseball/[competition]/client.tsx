"use client";

import TeamSportCompetitionHub from "@/components/team-sport-competition-hub";
import { fetchBaseballGames } from "@/lib/api";

export default function BaseballCompetitionHub({ params }: { params: { competition: string } }) {
  return <TeamSportCompetitionHub sport="baseball" competition={params.competition} fetchGames={fetchBaseballGames} />;
}
