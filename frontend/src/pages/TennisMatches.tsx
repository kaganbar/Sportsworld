import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ThemeLayout from "../components/ThemeLayout";
import { useLang } from "../i18n";
import { TennisMatch, fetchTennisMatches } from "../lib/api";

function startTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TennisMatches() {
  const { t } = useLang();
  const [matches, setMatches] = useState<TennisMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTennisMatches().then(setMatches).catch((e) => setError(String(e)));
  }, []);

  return (
    <ThemeLayout sport="tennis">
      <h2 className="page-title">{t("todaysGames")}</h2>
      {error && <p className="error-box">{t("loadErrorGames")}: {error}</p>}
      {!matches && !error && <p className="muted">{t("loadingFixtures")}</p>}
      {matches?.length === 0 && <p className="muted">{t("noGames")}</p>}
      <div className="game-list">
        {matches?.map((match) => (
          <Link key={match.id} to={`/tennis/matches/${match.id}`} className="game-card">
            <span className="competition">
              {match.tournament} · {match.round}
              {match.status === "live" && ` · ${t("liveNow")}`}
            </span>
            <div className="matchup">
              <span className="team home">{match.player1.name}</span>
              <span className="vs">
                {match.status === "scheduled" ? startTime(match.start_time) : t("liveNow")}
              </span>
              <span className="team away">{match.player2.name}</span>
            </div>
            <span className="venue">{match.venue}</span>
          </Link>
        ))}
      </div>
    </ThemeLayout>
  );
}
