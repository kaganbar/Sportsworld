import { TeamGameDetail } from "@/components/team-game-detail";

// A single placeholder param satisfies `output: export` (the Tauri static
// build); real IDs resolve client-side at runtime — the detail component
// fetches by id, reached via in-app navigation. Mirrors the pre-rebuild pattern.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function FootballGamePage({ params }: { params: { id: string } }) {
  return <TeamGameDetail sport="football" id={params.id} />;
}
