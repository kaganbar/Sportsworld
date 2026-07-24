import { TennisPlayerProfile } from "@/components/tennis-player-profile";

// See app/football/games/[id]/page.tsx for why this placeholder exists.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function TennisPlayerPage({ params }: { params: { id: string } }) {
  return <TennisPlayerProfile id={params.id} />;
}
