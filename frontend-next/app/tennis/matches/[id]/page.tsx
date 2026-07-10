"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AiAnalysisPanel from "@/components/ai-analysis-panel";
import ThemeLayout from "@/components/theme-layout";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useLang } from "@/lib/i18n";
import {
  TennisFormStats,
  TennisMatchDetail as TennisMatchDetailData,
  TennisMatchResult,
  fetchTennisAnalysis,
  fetchTennisMatchDetail,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function ResultRow({ result }: { result: TennisMatchResult }) {
  const score = result.sets.map((s) => `${s.player1_games}-${s.player2_games}`).join(", ");
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{result.start_time.slice(0, 10)}</span>
      <span dir="ltr" className="font-medium">
        {result.player1} vs {result.player2} — {result.winner} ({score})
      </span>
      <span className="text-muted-foreground">{result.tournament} {result.round}</span>
    </li>
  );
}

function StatsColumn({ label, stats }: { label: string; stats: TennisFormStats }) {
  const { t } = useLang();
  return (
    <div>
      <h4 className="mb-1 font-semibold">{label}</h4>
      <p className="text-lg font-bold">
        {stats.wins}{t("winsAbbr")} {stats.losses}{t("lossesAbbr")}
        <span className="ms-1 text-sm font-normal text-muted-foreground">({t("lastGames")}{stats.played})</span>
      </p>
    </div>
  );
}

export default function TennisMatchDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t, lang } = useLang();
  const [data, setData] = useState<TennisMatchDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      <Link href="/tennis" className="mb-4 inline-block text-sm text-white/80 hover:text-white">
        {t("backToGames")}
      </Link>
      {error && <p className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{t("loadErrorGame")}: {error}</p>}
      {!data && !error && <Skeleton className="h-24 w-full" />}
      {data && (
        <>
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <span className="text-xs text-muted-foreground">
                {data.match.tournament} · {data.match.round} · {data.match.venue}
                {data.match.status === "live" && (
                  <Badge variant="live" className="ms-2">{t("liveNow")}</Badge>
                )}
              </span>
              <div className="flex items-center gap-4 text-lg font-semibold">
                <span>{data.match.player1.name}</span>
                <span dir="ltr" className="rounded-md bg-muted px-3 py-1 text-xl font-bold">
                  {data.match.status === "scheduled"
                    ? new Date(data.match.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : data.sets.map((s) => `${s.player1_games}-${s.player2_games}`).join(", ") || "-"}
                </span>
                <span>{data.match.player2.name}</span>
              </div>
            </CardContent>
          </Card>

          <AiAnalysisPanel
            id={id}
            fetchAnalysis={fetchTennisAnalysis}
            probabilitySegments={(analysis) => [
              { key: "p1", label: data.match.player1.name, pct: analysis.probabilities.player1_win, className: "home" },
              { key: "p2", label: data.match.player2.name, pct: analysis.probabilities.player2_win, className: "away" },
            ]}
          />

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("form5")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatsColumn label={data.match.player1.name} stats={data.stats.player1} />
              <StatsColumn label={data.match.player2.name} stats={data.stats.player2} />
            </CardContent>
          </Card>

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
