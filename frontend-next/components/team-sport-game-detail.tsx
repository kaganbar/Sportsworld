"use client";

import { useEffect, useState } from "react";

import AiAnalysisPanel, { AgentAnalysisBase } from "@/components/ai-analysis-panel";
import ThemeLayout from "@/components/theme-layout";
import StatBarRow from "@/components/stat-bar-row";
import KeyPlayerCard from "@/components/key-player-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLiveGame } from "@/hooks/useLiveGame";
import { deriveKeyPlayer } from "@/lib/key-player";
import { Lang, TKey, useLang } from "@/lib/i18n";
import { FormStats, Game, GameStats, GameStatsSide, InjuryEntry, LineupEntry, PastResult } from "@/lib/api";
import { StatRowSchema } from "@/theme/statSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Shared by the 3 team sports whose games/[id] page is otherwise
// byte-identical: basketball/baseball/volleyball all have a 2-way
// (home/away, no draw) probability split and a periods table (quarters/
// innings/sets — same shape, different field names). Football is
// deliberately NOT included here: it has a 3-way probability (draw), an
// in-play clock (`minute`), and no periods table, so folding it in would
// make this component's generic surface worse than just having 4 files.
// Each sport-specific page.tsx stays responsible for its own live-tick
// reducer (`mergeTick`) and periods normalization (`periods`) — the parts
// that touch per-sport wire field names — so a mistake there is isolated
// to a ~15-line wrapper instead of buried in a shared generic.

interface TeamSportGameDetailBase {
  game: Game;
  lineups: { home: LineupEntry[]; away: LineupEntry[] };
  stats: { home: FormStats; away: FormStats };
  game_stats: GameStats | null;
  head_to_head: PastResult[];
  injuries: { home: InjuryEntry[]; away: InjuryEntry[] };
}

interface Period {
  key: number;
  label: string;
  home_score: number;
  away_score: number;
}

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

export default function TeamSportGameDetail<
  TDetail extends TeamSportGameDetailBase,
  TAnalysis extends AgentAnalysisBase & { probabilities: { home_win: number; away_win: number } },
>({
  id,
  sport,
  fetchDetail,
  fetchAnalysis,
  mergeTick,
  statRows,
  periodsTitleKey,
  periods,
}: {
  id: string;
  sport: "basketball" | "baseball" | "volleyball";
  fetchDetail: (id: string, lang: Lang) => Promise<TDetail>;
  fetchAnalysis: (id: string, lang: Lang) => Promise<TAnalysis>;
  mergeTick: (prev: TDetail, payload: any) => TDetail;
  statRows: StatRowSchema<GameStatsSide>[];
  periodsTitleKey: TKey;
  periods: (data: TDetail) => Period[];
}) {
  const { t, lang } = useLang();
  const [data, setData] = useState<TDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetail(id, lang).then(setData).catch((e) => setError(String(e)));
  }, [id, lang]);

  useLiveGame(
    data?.game.status === "live" ? `/ws/games/${sport}/${id}/` : null,
    (payload) => setData((prev) => (prev ? mergeTick(prev, payload) : prev)),
  );

  const isLive = data?.game.status === "live";
  const isFinished = data?.game.status === "finished";
  const statusLabel = data
    ? isLive
      ? t("liveNow")
      : isFinished
        ? t("statusFinished")
        : new Date(data.game.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const statusColorVar = isLive ? "var(--status-live)" : isFinished ? "var(--status-finished)" : "var(--status-upcoming)";

  const favorHome = data ? (data.game.home_score ?? 0) >= (data.game.away_score ?? 0) : true;
  const keyPlayer = data
    ? deriveKeyPlayer(data.lineups.home, data.lineups.away, data.game.home_team.name, data.game.away_team.name, favorHome)
    : null;
  const periodRows = data ? periods(data) : [];

  return (
    <ThemeLayout
      sport={sport}
      breadcrumbExtra={
        data ? [{ label: `${data.game.home_team.name} vs ${data.game.away_team.name}`, href: `/${sport}/games/${id}` }] : []
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
              <div className="min-w-[140px] text-center text-xl font-extrabold text-white">{data.game.home_team.name}</div>
              <div dir="ltr" className="text-4xl font-extrabold tracking-wide text-white">
                {data.game.status === "scheduled" ? "vs" : `${data.game.home_score ?? "-"} — ${data.game.away_score ?? "-"}`}
              </div>
              <div className="min-w-[140px] text-center text-xl font-extrabold text-white">{data.game.away_team.name}</div>
            </div>
            <div className="mt-4 text-[13px] text-white/50">
              {data.game.competition} · {data.game.venue}
            </div>
          </div>

          <Tabs defaultValue="overview" className="mb-6">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">{t("tab_overview")}</TabsTrigger>
              <TabsTrigger value="ai">{t("tab_ai")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {data.game_stats && (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl">
                  {statRows.map((row) => {
                    const homeVal = data.game_stats!.home[row.key] ?? 0;
                    const awayVal = data.game_stats!.away[row.key] ?? 0;
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
                  team={keyPlayer.team}
                  position={keyPlayer.position}
                  href={`/${sport}/players/${keyPlayer.id}`}
                />
              )}

              {periodRows.length > 0 && (
                <Card className="mb-0">
                  <CardHeader>
                    <CardTitle>{t(periodsTitleKey)}</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm" dir="ltr">
                      <thead>
                        <tr>
                          <th scope="col" />
                          {periodRows.map((p) => (
                            <th key={p.key} scope="col" className="px-2 py-1 text-center text-muted-foreground">{p.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th scope="row" className="pe-3 text-start font-medium">{data.game.home_team.short_name}</th>
                          {periodRows.map((p) => (
                            <td key={p.key} className="px-2 py-1 text-center">{p.home_score}</td>
                          ))}
                        </tr>
                        <tr>
                          <th scope="row" className="pe-3 text-start font-medium">{data.game.away_team.short_name}</th>
                          {periodRows.map((p) => (
                            <td key={p.key} className="px-2 py-1 text-center">{p.away_score}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <Card className="mb-0">
                <CardHeader>
                  <CardTitle>{t("form5")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <StatsColumn label={data.game.home_team.short_name} stats={data.stats.home} />
                  <StatsColumn label={data.game.away_team.short_name} stats={data.stats.away} />
                </CardContent>
              </Card>

              <Card className="mb-0">
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
                <Card className="mb-0">
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
                fetchAnalysis={fetchAnalysis}
                probabilitySegments={(analysis) => [
                  { key: "home", label: data.game.home_team.short_name, pct: analysis.probabilities.home_win, className: "home" },
                  { key: "away", label: data.game.away_team.short_name, pct: analysis.probabilities.away_win, className: "away" },
                ]}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </ThemeLayout>
  );
}
