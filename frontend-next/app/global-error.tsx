"use client";

// Next.js's last-resort boundary: unlike app/error.tsx, this is the ONLY
// boundary that catches an error thrown by the root layout itself (e.g. a
// bug in Providers/AppSidebar/the 3D canvas wrapper) — and per Next's own
// contract it must render its own <html>/<body>, replacing the root layout
// entirely while active. Deliberately self-contained (inline styles, no
// useLang()/Tailwind globals.css, no app components) since the very thing
// that crashed may be a shared provider or the stylesheet pipeline itself —
// this must stay renderable even if the rest of the app is broken.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0a0f", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: "28rem" }}>
            SportsWorld hit an unexpected error and couldn&apos;t load. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{ borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", padding: "0.5rem 1.25rem", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
