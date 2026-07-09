import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ThemeLayout from "../components/ThemeLayout";
import { useLang } from "../i18n";
import { Game, fetchBasketballGames } from "../lib/api";

function tipoffTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function BasketballGames() {
  const { t } = useLang();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBasketballGames().then(setGames).catch((e) => setError(String(e)));
  }, []);

  return (
    <ThemeLayout sport="basketball">
      <h2 className="page-title">{t("todaysGames")}</h2>
      {error && <p className="error-box">{t("loadErrorGames")}: {error}</p>}
      {!games && !error && <p className="muted">{t("loadingFixtures")}</p>}
      {games?.length === 0 && <p className="muted">{t("noGames")}</p>}
      <div className="game-list">
        {games?.map((game) => (
          <Link key={game.id} to={`/basketball/games/${game.id}`} className="game-card">
            <span className="competition">
              {game.competition}
              {game.status === "live" && ` · ${t("liveNow")}`}
            </span>
            <div className="matchup">
              <span className="team home">
                <i className="dot" style={{ background: game.home_team.primary_color }} />
                {game.home_team.name}
              </span>
              <span className="vs">
                {game.status === "scheduled"
                  ? tipoffTime(game.kickoff)
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
