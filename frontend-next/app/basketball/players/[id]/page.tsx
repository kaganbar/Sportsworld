import { PlayerProfile } from "@/components/player-profile";

// See app/football/games/[id]/page.tsx for why this placeholder exists.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function BasketballPlayerPage({ params }: { params: { id: string } }) {
  return <PlayerProfile id={params.id} />;
}
