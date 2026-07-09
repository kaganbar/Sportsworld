import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AiAnalysisPanel from "../components/AiAnalysisPanel";
import ThemeLayout from "../components/ThemeLayout";
import { useLiveGame } from "../hooks/useLiveGame";
import { useLang } from "../i18n";
import {
  TennisFormStats,
  TennisMatchDetail as TennisMatchDetailData,
  TennisMatchResult,
  fetchTennisAnalysis,
  fetchTennisMatchDetail,
} from "../lib/api";

function ResultRow({ result }: { result: TennisMatchResult }) {
  const score = result.sets.map((s) => `${s.player1_games}-${s.player2_games}`).join(", ");
  return (
    <li className="result-row">
      <span className="result-date">{result.start_time.slice(0, 10)}</span>
      <span className="result-score" dir="ltr">
        {result.player1} vs {result.player2} — {result.winner} ({score})
      </span>
      <span className="result-comp">{result.tournament} {result.round}</span>
    </li>
  );
}

function StatsColumn({ label, stats }: { label: string; stats: TennisFormStats }) {
  const { t } = useLang();
  return (
    <div className="stats-col">
      <h4>{label}</h4>
      <p className="stat-line big">
        {stats.wins}{t("winsAbbr")} {stats.losses}{t("lossesAbbr")}
        <span className="muted"> ({t("lastGames")}{stats.played})</span>
      </p>
    </div>
  );
}

export default function TennisMatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const [data, setData] = useState<TennisMatchDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchTennisMatchDetail(id, lang).then(setData).catch((e) => setError(String(e)));
  }, [id, lang]);

  useLiveGame(
    data?.match.status === "live" ? `/ws/tennis/${id}/` : null,
    (payload) => {
      setData((prev) => {
        if (!prev) return prev;
        const sets = [...prev.sets];
        const idx = sets.findIndex((s) => s.set_number === payload.set_number);
        const updatedSet = {
          set_number: payload.set_number,
          player1_games: payload.player1_games,
          player2_games: payload.player2_games,
        };
        if (idx >= 0) sets[idx] = updatedSet;
        else sets.push(updatedSet);
        return {
          ...prev,
          sets,
          match: { ...prev.match, status: payload.status ?? prev.match.status },
        };
      });
    },
  );

  return (
    <ThemeLayout sport="tennis">
      <Link to="/tennis" className="back-link">
        {t("backToGames")}
      </Link>
      {error && <p className="error-box">{t("loadErrorGame")}: {error}</p>}
      {!data && !error && <p className="muted">{t("loadingMatch")}</p>}
      {data && id && (
        <>
          <section className="panel scoreboard">
            <span className="competition">
              {data.match.tournament} · {data.match.round} · {data.match.venue}
              {data.match.status === "live" && ` · ${t("liveNow")}`}
            </span>
            <div className="matchup large">
              <span className="team">{data.match.player1.name}</span>
              <span className="vs" dir="ltr">
                {data.match.status === "scheduled"
                  ? new Date(data.match.start_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : data.sets.map((s) => `${s.player1_games}-${s.player2_games}`).join(", ") || "-"}
              </span>
              <span className="team">{data.match.player2.name}</span>
            </div>
          </section>

          <AiAnalysisPanel
            id={id}
            fetchAnalysis={fetchTennisAnalysis}
            probabilitySegments={(analysis) => [
              { key: "p1", label: data.match.player1.name, pct: analysis.probabilities.player1_win, className: "home" },
              { key: "p2", label: data.match.player2.name, pct: analysis.probabilities.player2_win, className: "away" },
            ]}
          />

          <section className="panel">
            <h3>{t("form5")}</h3>
            <div className="stats-grid">
              <StatsColumn label={data.match.player1.name} stats={data.stats.player1} />
              <StatsColumn label={data.match.player2.name} stats={data.stats.player2} />
            </div>
          </section>

          <section className="panel">
            <h3>{t("h2h")}</h3>
            {data.head_to_head.length === 0 ? (
              <p className="muted">{t("noH2h")}</p>
            ) : (
              <ul className="result-list">
                {data.head_to_head.map((result, i) => (
                  <ResultRow key={i} result={result} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </ThemeLayout>
  );
}
