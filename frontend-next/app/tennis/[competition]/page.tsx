import TennisCompetitionHub from "./client";

// A Server Component wrapper (no "use client") so this can export
// generateStaticParams() — see app/baseball/[competition]/page.tsx's
// comment for the full reasoning (required for the Tauri desktop build's
// static export; the actual page logic is unchanged, just moved to
// client.tsx since generateStaticParams can't live in a "use client" file).
export function generateStaticParams() {
  return [{ competition: "placeholder" }];
}

export default function Page({ params }: { params: { competition: string } }) {
  return <TennisCompetitionHub params={params} />;
}
