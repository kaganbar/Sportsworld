import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ThemeLayout from "../components/ThemeLayout";
import { useLang } from "../i18n";
import { Game, fetchTodaysGames } from "../lib/api";

function kickoffTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function FootballGames() {
  const { t } = useLang();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysGames().then(setGames).catch((e) => setError(String(e)));
  }, []);

  return (
    <ThemeLayout sport="football">
      <h2 className="page-title">{t("todaysGames")}</h2>
      {error && <p className="error-box">{t("loadErrorGames")}: {error}</p>}
      {!games && !error && <p className="muted">{t("loadingFixtures")}</p>}
      {games?.length === 0 && <p className="muted">{t("noGames")}</p>}
      <div className="game-list">
        {games?.map((game) => (
          <Link key={game.id} to={`/football/games/${game.id}`} className="game-card">
            <span className="competition">{game.competition}</span>
            <div className="matchup">
              <span className="team home">
                <i className="dot" style={{ background: game.home_team.primary_color }} />
                {game.home_team.name}
              </span>
              <span className="vs">
                {game.status === "scheduled"
                  ? kickoffTime(game.kickoff)
                  : `${game.home_score ?? "-"} : ${game.away_score ?? "-"}`}
              </span>
              <span className="team away">
                {game.away_team.name}
                <i className="dot" style={{ background: game.away_team.primary_color }} />
              </span>
            </div>
            <span className="venue">{game.venue}</span>
          </Link>
        ))}
      </div>
    </ThemeLayout>
  );
}
