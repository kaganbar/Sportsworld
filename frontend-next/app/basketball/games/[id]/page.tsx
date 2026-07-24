import { TeamGameDetail } from "@/components/team-game-detail";

// See app/football/games/[id]/page.tsx for why this placeholder exists.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function BasketballGamePage({ params }: { params: { id: string } }) {
  return <TeamGameDetail sport="basketball" id={params.id} />;
}
