import { TeamRoster } from "@/components/team-roster";

// See app/football/games/[id]/page.tsx for why this placeholder exists.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function BaseballTeamPage({ params }: { params: { id: string } }) {
  return <TeamRoster id={params.id} />;
}
