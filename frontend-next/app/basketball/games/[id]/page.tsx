"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AiAnalysisPanel from "@/components/ai-analysis-panel";
import ThemeLayout from "@/components/theme-layout";
import { useLiveGame } from "@/hooks/useLiveGame";
import { TKey, useLang } from "@/lib/i18n";
import {
  BasketballGameDetail as BasketballGameDetailData,
  FormStats,
  LineupEntry,
  PastResult,
  fetchBasketballAnalysis,
  fetchBasketballGameDetail,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function ResultRow({ result }: { result: PastResult }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{result.date}</span>
      <span dir="ltr" className="font-medium">
        {result.home_team} {result.home_score}–{result.away_score} {result.away_team}
      </span>
      <span className="text-muted-foreground">{result.competition}</span>
    </li>
  );
}

function StatsColumn({ label, stats }: { label: string; stats: FormStats }) {
  const { t } = useLang();
  return (
    <div>
      <h4 className="mb-1 font-semibold">{label}</h4>
      <p className="text-lg font-bold">
        {stats.wins}{t("winsAbbr")} {stats.losses}{t("lossesAbbr")}
      </p>
      <p className="text-sm text-muted-foreground">
        {stats.goals_for} {t("scored")} · {stats.goals_against} {t("conceded")} ({t("lastGames")}{stats.played})
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
      <ul className="space-y-1 text-sm">
        {starters.map((p) => (
          <li key={p.shirt_number}>
            <span className="me-2 inline-block w-6 text-center font-mono text-muted-foreground">{p.shirt_number}</span>
            {p.name} <span className="text-muted-foreground">{p.position}</span>
          </li>
        ))}
      </ul>
      {bench.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("bench")}: {bench.map((p) => p.name).join(", ")}
        </p>
      )}
    </div>
  );
}

export default function BasketballGameDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t, lang } = useLang();
  const [data, setData] = useState<BasketballGameDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      <Link href="/basketball" className="mb-4 inline-block text-sm text-white/80 hover:text-white">
        {t("backToGames")}
      </Link>
      {error && <p className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{t("loadErrorGame")}: {error}</p>}
      {!data && !error && <Skeleton className="h-24 w-full" />}
      {data && (
        <>
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <span className="text-xs text-muted-foreground">
                {data.game.competition} · {data.game.venue}
                {data.game.status === "live" && (
                  <Badge variant="live" className="ms-2">{t("liveNow")}</Badge>
                )}
              </span>
              <div className="flex items-center gap-4 text-lg font-semibold">
                <span>{data.game.home_team.name}</span>
                <span dir="ltr" className="rounded-md bg-muted px-3 py-1 text-xl font-bold">
                  {data.game.status === "scheduled"
                    ? new Date(data.game.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : `${data.game.home_score ?? "-"} : ${data.game.away_score ?? "-"}`}
                </span>
                <span>{data.game.away_team.name}</span>
              </div>
            </CardContent>
          </Card>

          {data.quarters.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t("quarters")}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm" dir="ltr">
                  <thead>
                    <tr>
                      <th />
                      {data.quarters.map((q) => (
                        <th key={q.quarter} className="px-2 py-1 text-center text-muted-foreground">Q{q.quarter}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pe-3 font-medium">{data.game.home_team.short_name}</td>
                      {data.quarters.map((q) => (
                        <td key={q.quarter} className="px-2 py-1 text-center">{q.home_score}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pe-3 font-medium">{data.game.away_team.short_name}</td>
                      {data.quarters.map((q) => (
                        <td key={q.quarter} className="px-2 py-1 text-center">{q.away_score}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <AiAnalysisPanel
            id={id}
            fetchAnalysis={fetchBasketballAnalysis}
            probabilitySegments={(analysis) => [
              { key: "home", label: data.game.home_team.short_name, pct: analysis.probabilities.home_win, className: "home" },
              { key: "away", label: data.game.away_team.short_name, pct: analysis.probabilities.away_win, className: "away" },
            ]}
          />

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("form5")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatsColumn label={data.game.home_team.short_name} stats={data.stats.home} />
              <StatsColumn label={data.game.away_team.short_name} stats={data.stats.away} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("lineups")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-2 font-semibold">{data.game.home_team.name}</h4>
                <LineupList entries={data.lineups.home} />
              </div>
              <div>
                <h4 className="mb-2 font-semibold">{data.game.away_team.name}</h4>
                <LineupList entries={data.lineups.away} />
              </div>
            </CardContent>
          </Card>

          {(data.injuries.home.length > 0 || data.injuries.away.length > 0) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t("injuries")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {(["home", "away"] as const).map((side) => (
                  <div key={side}>
                    <h4 className="mb-2 font-semibold">{data.game[`${side}_team`].name}</h4>
                    <ul className="space-y-1 text-sm">
                      {data.injuries[side].map((injury) => (
                        <li key={injury.player}>
                          <strong>{injury.player}</strong> — {t(`injury_${injury.status}` as TKey)} ({injury.reason})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("h2h")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.head_to_head.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noH2h")}</p>
              ) : (
                <ul>
                  {data.head_to_head.map((result, i) => (
                    <ResultRow key={i} result={result} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </ThemeLayout>
  );
}
