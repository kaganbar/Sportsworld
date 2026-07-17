"use client";

import TeamSportCompetitionHub from "@/components/team-sport-competition-hub";
import { fetchTodaysGames } from "@/lib/api";

export default function FootballCompetitionHub({ params }: { params: { competition: string } }) {
  return <TeamSportCompetitionHub sport="football" competition={params.competition} fetchGames={fetchTodaysGames} showDraws />;
}
