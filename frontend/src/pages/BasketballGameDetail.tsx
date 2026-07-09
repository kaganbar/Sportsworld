import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AiAnalysisPanel from "../components/AiAnalysisPanel";
import ThemeLayout from "../components/ThemeLayout";
import { useLiveGame } from "../hooks/useLiveGame";
import { TKey, useLang } from "../i18n";
import {
  BasketballGameDetail as BasketballGameDetailData,
  FormStats,
  LineupEntry,
  PastResult,
  fetchBasketballAnalysis,
  fetchBasketballGameDetail,
} from "../lib/api";

function ResultRow({ result }: { result: PastResult }) {
  return (
    <li className="result-row">
      <span className="result-date">{result.date}</span>
      <span className="result-score" dir="ltr">
        {result.home_team} {result.home_score}–{result.away_score} {result.away_team}
      </span>
      <span className="result-comp">{result.competition}</span>
    </li>
  );
}

function StatsColumn({ label, stats }: { label: string; stats: FormStats }) {
  const { t } = useLang();
  return (
    <div className="stats-col">
      <h4>{label}</h4>
      <p className="stat-line big">
        {stats.wins}{t("winsAbbr")} {stats.losses}{t("lossesAbbr")}
      </p>
      <p className="stat-line">
        {stats.goals_for} {t("scored")} · {stats.goals_against} {t("conceded")}
        <span className="muted"> ({t("lastGames")}{stats.played})</span>
      </p>
    </div>
  );
}

function LineupList({ entries }: { entries: LineupEntry[] }) {
  const { t } = useLang();
  const starters = entries.filter((e) => e.is_starting);
  const bench = entries.filter((e) => !e.is_starting);
  return (
    <div>
      <ul className="lineup">
        {starters.map((p) => (
          <li key={p.shirt_number}>
            <span className="shirt">{p.shirt_number}</span>
            {p.name} <span className="pos">{p.position}</span>
          </li>
        ))}
      </ul>
      {bench.length > 0 && (
        <p className="bench muted">
          {t("bench")}: {bench.map((p) => p.name).join(", ")}
        </p>
      )}
    </div>
  );
}

export default function BasketballGameDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const [data, setData] = useState<BasketballGameDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBasketballGameDetail(id, lang).then(setData).catch((e) => setError(String(e)));
  }, [id, lang]);

  useLiveGame(
    data?.game.status === "live" ? `/ws/games/basketball/${id}/` : null,
    (payload) => {
      setData((prev) => {
        if (!prev) return prev;
        const quarters = [...prev.quarters];
        const idx = quarters.findIndex((q) => q.quarter === payload.quarter);
        const updatedQuarter = {
          quarter: payload.quarter,
          home_score: payload.quarter_home_score,
          away_score: payload.quarter_away_score,
        };
        if (idx >= 0) quarters[idx] = updatedQuarter;
        else quarters.push(updatedQuarter);
        return {
          ...prev,
          game: {
            ...prev.game,
            home_score: payload.home_score,
            away_score: payload.away_score,
            status: payload.status ?? prev.game.status,
          },
          quarters,
        };
      });
    },
  );

  return (
    <ThemeLayout sport="basketball">
      <Link to="/basketball" className="back-link">
        {t("backToGames")}
      </Link>
      {error && <p className="error-box">{t("loadErrorGame")}: {error}</p>}
      {!data && !error && <p className="muted">{t("loadingMatch")}</p>}
      {data && id && (
        <>
          <section className="panel scoreboard">
            <span className="competition">
              {data.game.competition} · {data.game.venue}
              {data.game.status === "live" && ` · ${t("liveNow")}`}
            </span>
            <div className="matchup large">
              <span className="team">{data.game.home_team.name}</span>
              <span className="vs" dir="ltr">
                {data.game.status === "scheduled"
                  ? new Date(data.game.kickoff).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : `${data.game.home_score ?? "-"} : ${data.game.away_score ?? "-"}`}
              </span>
              <span className="team">{data.game.away_team.name}</span>
            </div>
          </section>

          {data.quarters.length > 0 && (
            <section className="panel">
              <h3>{t("quarters")}</h3>
              <div className="quarter-table-wrap">
                <table className="quarter-table">
                  <thead>
                    <tr>
                      <th />
                      {data.quarters.map((q) => (
                        <th key={q.quarter}>Q{q.quarter}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{data.game.home_team.short_name}</td>
                      {data.quarters.map((q) => (
                        <td key={q.quarter}>{q.home_score}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>{data.game.away_team.short_name}</td>
                      {data.quarters.map((q) => (
                        <td key={q.quarter}>{q.away_score}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <AiAnalysisPanel
            id={id}
            fetchAnalysis={fetchBasketballAnalysis}
            probabilitySegments={(analysis) => [
              { key: "home", label: data.game.home_team.short_name, pct: analysis.probabilities.home_win, className: "home" },
              { key: "away", label: data.game.away_team.short_name, pct: analysis.probabilities.away_win, className: "away" },
            ]}
          />

          <section className="panel">
            <h3>{t("form5")}</h3>
            <div className="stats-grid">
              <StatsColumn label={data.game.home_team.short_name} stats={data.stats.home} />
              <StatsColumn label={data.game.away_team.short_name} stats={data.stats.away} />
            </div>
          </section>

          <section className="panel">
            <h3>{t("lineups")}</h3>
            <div className="lineup-grid">
              <div>
                <h4>{data.game.home_team.name}</h4>
                <LineupList entries={data.lineups.home} />
              </div>
              <div>
                <h4>{data.game.away_team.name}</h4>
                <LineupList entries={data.lineups.away} />
              </div>
            </div>
          </section>

          {(data.injuries.home.length > 0 || data.injuries.away.length > 0) && (
            <section className="panel">
              <h3>{t("injuries")}</h3>
              <div className="lineup-grid">
                {(["home", "away"] as const).map((side) => (
                  <div key={side}>
                    <h4>{data.game[`${side}_team`].name}</h4>
                    <ul className="injury-list">
                      {data.injuries[side].map((injury) => (
                        <li key={injury.player}>
                          <strong>{injury.player}</strong> —{" "}
                          {t(`injury_${injury.status}` as TKey)} ({injury.reason})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

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
