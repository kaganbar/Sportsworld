"use client";

import TeamSportCompetitionHub from "@/components/team-sport-competition-hub";
import { fetchBasketballGames } from "@/lib/api";

export default function BasketballCompetitionHub({ params }: { params: { competition: string } }) {
  return <TeamSportCompetitionHub sport="basketball" competition={params.competition} fetchGames={fetchBasketballGames} />;
}
