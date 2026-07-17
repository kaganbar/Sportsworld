import BaseballCompetitionHub from "./client";

// A Server Component wrapper, not "use client" — that's what lets it export
// generateStaticParams(): Next's static export (output: "export", required
// for the Tauri desktop build) needs every dynamic segment to have one.
// Returning an EMPTY array doesn't satisfy this — Next's own build source
// (build/index.js's `hasGenerateStaticParams = !!(prerenderRoutes?.length)`)
// treats a zero-length result identically to no generateStaticParams at
// all, so `output: "export"` rejects the route either way (confirmed by
// reading that check directly, after `[]` produced a build error that
// nondeterministically named a different already-correct route on every
// run — all 15 dynamic routes were failing this exact check simultaneously
// the whole time; Promise.all just surfaced whichever one's async check
// settled first). One placeholder value is enough: it generates a single
// static HTML/JS shell for this route, which the Tauri webview only ever
// needs for its initial load — after that, all navigation is client-side.
//
// The actual JSX/config lives in client.tsx, not here: a Server Component
// can't pass function-valued props (fetchGames, statRows, periods,
// mergeTick, etc. — every one of these config objects is full of them) to
// a Client Component, so this file can only ever forward `params` (a plain
// string-keyed object, always safe to pass across the boundary).
export function generateStaticParams() {
  return [{ competition: "placeholder" }];
}

export default function Page({ params }: { params: { competition: string } }) {
  return <BaseballCompetitionHub params={params} />;
}
