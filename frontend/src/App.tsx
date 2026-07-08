import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type HealthStatus = { status: string; service: string };

// Phase 0 placeholder: proves frontend <-> backend wiring works.
// Phase 1 replaces this with SportSelect / FootballGames / GameDetail pages
// (see /Users/barkagan/.claude/plans/ancient-wishing-emerson.md, section 3.4).
export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/health/`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setHealth)
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>SportsWorld</h1>
      {error && <p style={{ color: "crimson" }}>Backend unreachable: {error}</p>}
      {health && (
        <p>
          Backend says: <strong>{health.status}</strong> ({health.service})
        </p>
      )}
      {!health && !error && <p>Checking backend...</p>}
    </main>
  );
}
