"use client";

import TeamSportRoster from "@/components/team-sport-roster";

export default function VolleyballTeamRoster({ params }: { params: { id: string } }) {
  return <TeamSportRoster teamId={params.id} sport="volleyball" />;
}
