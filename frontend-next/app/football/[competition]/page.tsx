import FootballCompetitionHub from "./client";

// See app/baseball/[competition]/page.tsx's comment for why this Server
// Component wrapper exists (generateStaticParams for the Tauri static
// export build) and why the actual JSX/config lives in client.tsx instead
// of here: this file can only ever pass `params` (a plain string-keyed
// object) as a prop — a Server Component can't pass function-valued props
// (fetchGames, statRows, periods, mergeTick, etc.) to a Client Component,
// which every one of these config objects is full of.
export function generateStaticParams() {
  return [{ competition: "placeholder" }];
}

export default function Page({ params }: { params: { competition: string } }) {
  return <FootballCompetitionHub params={params} />;
}
