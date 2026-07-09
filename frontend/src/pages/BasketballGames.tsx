import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ThemeLayout from "../components/ThemeLayout";
import { useLiveGame } from "../hooks/useLiveGame";
import { TKey, useLang } from "../i18n";
import { Game, fetchBasketballGames } from "../lib/api";

function tipoffTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function GameCard({ game, t }: { game: Game; t: (key: TKey) => string }) {
  const [live, setLive] = useState(game);
  useEffect(() => setLive(game), [game]);

  useLiveGame(
    game.status === "live" ? `/ws/games/basketball/${game.id}/` : null,
    (payload) =>
      setLive((prev) => ({
        ...prev,
        home_score: payload.home_score,
        away_score: payload.away_score,
        status: payload.status ?? prev.status,
      })),
  );

  return (
    <Link to={`/basketball/games/${live.id}`} className="game-card">
      <span className="competition">
        {live.competition}
        {live.status === "live" && ` · ${t("liveNow")}`}
      </span>
      <div className="matchup">
        <span className="team home">
          <i className="dot" style={{ background: live.home_team.primary_color }} />
          {live.home_team.name}
        </span>
        <span className="vs" dir="ltr">
          {live.status === "scheduled"
            ? tipoffTime(live.kickoff)
            : `${live.home_score ?? "-"} : ${live.away_score ?? "-"}`}
        </span>
        <span className="team away">
          {live.away_team.name}
          <i className="dot" style={{ background: live.away_team.primary_color }} />
        </span>
      </div>
      <span className="venue">{live.venue}</span>
    </Link>
  );
}

export default function BasketballGames() {
  const { t, lang } = useLang();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBasketballGames(lang).then(setGames).catch((e) => setError(String(e)));
  }, [lang]);

  return (
    <ThemeLayout sport="basketball">
      <h2 className="page-title">{t("todaysGames")}</h2>
      {error && <p className="error-box">{t("loadErrorGames")}: {error}</p>}
      {!games && !error && <p className="muted">{t("loadingFixtures")}</p>}
      {games?.length === 0 && <p className="muted">{t("noGames")}</p>}
      <div className="game-list">
        {games?.map((game) => (
          <GameCard key={game.id} game={game} t={t} />
        ))}
      </div>
    </ThemeLayout>
  );
}
