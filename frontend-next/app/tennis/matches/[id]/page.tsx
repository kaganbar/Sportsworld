"use client";

import { useEffect, useState } from "react";

import AiAnalysisPanel from "@/components/ai-analysis-panel";
import ThemeLayout from "@/components/theme-layout";
import StatBarRow from "@/components/stat-bar-row";
import KeyPlayerCard from "@/components/key-player-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useLang } from "@/lib/i18n";
import {
  TennisFormStats,
  TennisMatchDetail as TennisMatchDetailData,
  TennisMatchResult,
  fetchTennisAnalysis,
  fetchTennisMatchDetail,
} from "@/lib/api";
import { TENNIS_STAT_ROWS } from "@/theme/statSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const isLive = data?.match.status === "live";
  const isFinished = data?.match.status === "finished";
  const statusLabel = data
    ? isLive
      ? t("liveNow")
      : isFinished
        ? t("statusFinished")
        : new Date(data.match.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const statusColorVar = isLive ? "var(--status-live)" : isFinished ? "var(--status-finished)" : "var(--status-upcoming)";

  const setsWon1 = data ? data.sets.filter((s) => s.player1_games > s.player2_games).length : 0;
  const setsWon2 = data ? data.sets.filter((s) => s.player2_games > s.player1_games).length : 0;
  const favorP1 = setsWon1 >= setsWon2;
  const tourLabel = data ? t(data.match.tour === "atp" ? "tourAtp" : "tourWta") : "";
  const keyPlayer = data
    ? {
        id: (favorP1 ? data.match.player1 : data.match.player2).id,
        name: (favorP1 ? data.match.player1 : data.match.player2).name,
      }
    : null;

  return (
    <ThemeLayout
      sport="tennis"
      breadcrumbExtra={
        data ? [{ label: `${data.match.player1.name} vs ${data.match.player2.name}`, href: `/tennis/matches/${id}` }] : []
      }
    >
      {error && <p role="alert" className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{t("loadErrorGame")}: {error}</p>}
      {!data && !error && <Skeleton className="h-24 w-full" />}
      {data && (
        <>
          <div className="glass-panel mb-6 rounded-[26px] p-9 text-center">
            <div className="mb-5 flex items-center justify-center gap-2">
              {isLive && <span className="live-dot h-2 w-2 rounded-full bg-[var(--status-live)]" />}
              <span className="text-[13px] font-bold tracking-wide" style={{ color: statusColorVar }}>
                {statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="min-w-[140px] text-center text-xl font-extrabold text-white">{data.match.player1.name}</div>
              <div dir="ltr" className="text-4xl font-extrabold tracking-wide text-white">
                {data.match.status === "scheduled"
                  ? "vs"
                  : data.sets.map((s) => `${s.player1_games}-${s.player2_games}`).join(", ") || "-"}
              </div>
              <div className="min-w-[140px] text-center text-xl font-extrabold text-white">{data.match.player2.name}</div>
            </div>
            <div className="mt-4 text-[13px] text-white/50">
              {data.match.tournament} · {data.match.round} · {data.match.venue}
            </div>
          </div>

          <Tabs defaultValue="overview" className="mb-6">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">{t("tab_overview")}</TabsTrigger>
              <TabsTrigger value="ai">{t("tab_ai")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {data.match_stats && (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl">
                  {TENNIS_STAT_ROWS.map((row) => {
                    const homeVal = data.match_stats!.home[row.key] ?? 0;
                    const awayVal = data.match_stats!.away[row.key] ?? 0;
                    const total = homeVal + awayVal || 1;
                    return (
                      <StatBarRow
                        key={String(row.key)}
                        label={t(row.labelKey)}
                        homeVal={`${homeVal}${row.suffix ?? ""}`}
                        awayVal={`${awayVal}${row.suffix ?? ""}`}
                        homePct={Math.round((homeVal / total) * 100)}
                        awayPct={Math.round((awayVal / total) * 100)}
                      />
                    );
                  })}
                </div>
              )}

              {keyPlayer && (
                <KeyPlayerCard
                  name={keyPlayer.name}
                  team={tourLabel}
                  position={t("positionSingles")}
                  href={`/tennis/players/${keyPlayer.id}`}
                />
              )}

              <Card className="mb-0">
                <CardHeader>
                  <CardTitle>{t("form5")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <StatsColumn label={data.match.player1.name} stats={data.stats.player1} />
                  <StatsColumn label={data.match.player2.name} stats={data.stats.player2} />
                </CardContent>
              </Card>

              <Card className="mb-0">
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
            </TabsContent>

            <TabsContent value="ai">
              <AiAnalysisPanel
                id={id}
                fetchAnalysis={fetchTennisAnalysis}
                probabilitySegments={(analysis) => [
                  { key: "p1", label: data.match.player1.name, pct: analysis.probabilities.player1_win, className: "home" },
                  { key: "p2", label: data.match.player2.name, pct: analysis.probabilities.player2_win, className: "away" },
                ]}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </ThemeLayout>
  );
}
