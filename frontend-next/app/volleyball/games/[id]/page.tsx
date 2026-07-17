import VolleyballGamePage from "./client";

// See app/baseball/[competition]/page.tsx's comment for the full reasoning.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Page({ params }: { params: { id: string } }) {
  return <VolleyballGamePage params={params} />;
}
