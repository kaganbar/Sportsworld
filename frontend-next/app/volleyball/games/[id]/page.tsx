import { TeamGameDetail } from "@/components/team-game-detail";

// See app/football/games/[id]/page.tsx for why this placeholder exists.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function VolleyballGamePage({ params }: { params: { id: string } }) {
  return <TeamGameDetail sport="volleyball" id={params.id} />;
}
