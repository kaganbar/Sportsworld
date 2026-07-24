import { TennisMatchDetail } from "@/components/tennis-match-detail";

// See app/football/games/[id]/page.tsx for why this placeholder exists.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function TennisMatchPage({ params }: { params: { id: string } }) {
  return <TennisMatchDetail id={params.id} />;
}
