import BasketballCompetitionHub from "./client";

// See app/baseball/[competition]/page.tsx's comment for the full reasoning.
export function generateStaticParams() {
  return [{ competition: "placeholder" }];
}

export default function Page({ params }: { params: { competition: string } }) {
  return <BasketballCompetitionHub params={params} />;
}
