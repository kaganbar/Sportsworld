"use client";

import TeamSportRoster from "@/components/team-sport-roster";

export default function BaseballTeamRoster({ params }: { params: { id: string } }) {
  return <TeamSportRoster teamId={params.id} sport="baseball" />;
}
