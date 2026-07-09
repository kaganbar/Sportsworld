import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AiAnalysisPanel from "../components/AiAnalysisPanel";
import ThemeLayout from "../components/ThemeLayout";
import { TKey, useLang } from "../i18n";
import {
  FormStats,
  GameDetail as GameDetailData,
  LineupEntry,
  PastResult,
  fetchGameDetail,
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
        {stats.wins}{t("winsAbbr")} {stats.draws}{t("drawsAbbr")} {stats.losses}{t("lossesAbbr")}
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

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLang();
  const [data, setData] = useState<GameDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchGameDetail(id).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  return (
    <ThemeLayout sport="football">
      <Link to="/football" className="back-link">
        {t("backToGames")}
      </Link>
      {error && <p className="error-box">{t("loadErrorGame")}: {error}</p>}
      {!data && !error && <p className="muted">{t("loadingMatch")}</p>}
      {data && id && (
        <>
          <section className="panel scoreboard">
            <span className="competition">{data.game.competition} · {data.game.venue}</span>
            <div className="matchup large">
              <span className="team">{data.game.home_team.name}</span>
              <span className="vs">
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

          <AiAnalysisPanel
            gameId={id}
            homeName={data.game.home_team.short_name}
            awayName={data.game.away_team.short_name}
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
