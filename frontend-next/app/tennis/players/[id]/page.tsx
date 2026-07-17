import TennisPlayerProfile from "./client";

// See app/baseball/[competition]/page.tsx's comment for why this Server
// Component wrapper exists (generateStaticParams for the Tauri static
// export build).
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Page({ params }: { params: { id: string } }) {
  return <TennisPlayerProfile params={params} />;
}
