"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import GameCard from "@/components/game-card";
import TeamBadge from "@/components/team-badge";
import SimulatedBadge from "@/components/simulated-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lang, TKey, useLang } from "@/lib/i18n";
import {
  Game,
  NewsCluster,
  TransferStory,
  StandingsRow,
  fetchCompetitions,
  fetchStandings,
  fetchNewsClusters,
  fetchTransferStories,
} from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";
import { competitionAccents } from "@/theme/sportsTheme";

const transferStatusKey: Record<TransferStory["status"], TKey> = {
  rumor: "transferStatus_rumor",
  official: "transferStatus_official",
  completed: "transferStatus_completed",
  denied: "transferStatus_denied",
};

// Shared by the 4 team sports' [competition]/page.tsx (football/basketball/
// baseball/volleyball) — these were copy-pasted file-for-file, differing
// only in the sport key, the games-fetch function, and (football only) 2
// extra standings columns (draws, goal diff) that don't apply to the 3
// sports with no draw. Tennis stays a separate file: rankings instead of
// standings, no transfers tab, MatchCard instead of GameCard.
export default function TeamSportCompetitionHub({
  sport,
  competition,
  fetchGames,
  showDraws = false,
}: {
  sport: "football" | "basketball" | "baseball" | "volleyball";
  competition: string;
  fetchGames: (lang: Lang, competition?: string) => Promise<Game[]>;
  showDraws?: boolean;
}) {
  const { t, lang } = useLang();
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [games, setGames] = useState<Game[] | null>(null);
  const [standings, setStandings] = useState<StandingsRow[] | null>(null);
  const [news, setNews] = useState<NewsCluster[] | null>(null);
  const [transfers, setTransfers] = useState<TransferStory[] | null>(null);

  useEffect(() => {
    fetchCompetitions(sport, lang).then((list) => setLabel(list.find((c) => c.slug === competition)?.name));
  }, [sport, competition, lang]);
  useEffect(() => {
    fetchGames(lang, competition).then(setGames);
  }, [lang, competition]);
  useEffect(() => {
    fetchStandings(sport, competition, lang).then(setStandings);
  }, [sport, lang, competition]);
  useEffect(() => {
    fetchNewsClusters(lang, 30, sport, competition).then(setNews);
  }, [sport, lang, competition]);
  useEffect(() => {
    fetchTransferStories(lang, 30, sport, competition).then(setTransfers);
  }, [sport, lang, competition]);

  const live = games?.filter((g) => g.status === "live") ?? [];
  // Not just "!= live" — that would also catch already-finished games,
  // which have no business showing up in an "Upcoming" tab.
  const upcoming = games?.filter((g) => g.status === "scheduled") ?? [];

  return (
    <ThemeLayout
      sport={sport}
      competitionAccent={competitionAccents[competition]}
      competitionLabel={label}
      breadcrumbExtra={label ? [{ label, href: `/${sport}/${competition}` }] : []}
    >
      <Tabs defaultValue="live" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="live">{t("tab_live")}</TabsTrigger>
          <TabsTrigger value="upcoming">{t("tab_upcoming")}</TabsTrigger>
          <TabsTrigger value="standings">{t("tab_standings")}</TabsTrigger>
          <TabsTrigger value="news">{t("tab_news")}</TabsTrigger>
          <TabsTrigger value="transfers">{t("tab_transfers")}</TabsTrigger>
          <TabsTrigger value="ai">{t("tab_ai")}</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-3">
          {!games && <Skeleton className="h-20 w-full" />}
          {games && live.length === 0 && <p className="text-white/70">{t("noLiveGames")}</p>}
          {live.map((g) => (
            <GameCard key={g.id} game={g} sport={sport} t={t} />
          ))}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {!games && <Skeleton className="h-20 w-full" />}
          {games && upcoming.length === 0 && <p className="text-white/70">{t("noUpcomingGames")}</p>}
          {upcoming.map((g) => (
            <GameCard key={g.id} game={g} sport={sport} t={t} />
          ))}
        </TabsContent>

        <TabsContent value="standings">
          {!standings && <Skeleton className="h-40 w-full" />}
          {standings && standings.length === 0 && <p className="text-white/70">{t("noStandingsData")}</p>}
          {standings && standings.length > 0 && (
            <Card variant="glass">
              <CardContent className="overflow-x-auto p-4">
                <table className="w-full text-sm" dir="ltr">
                  <thead>
                    <tr className="text-white/60">
                      <th scope="col" className="px-2 py-1 text-start">#</th>
                      <th scope="col" className="px-2 py-1 text-start">{t("tableTeam")}</th>
                      <th scope="col" className="px-2 py-1">P</th>
                      <th scope="col" className="px-2 py-1">{t("winsAbbr")}</th>
                      {showDraws && <th scope="col" className="px-2 py-1">{t("drawsAbbr")}</th>}
                      <th scope="col" className="px-2 py-1">{t("lossesAbbr")}</th>
                      {showDraws && <th scope="col" className="px-2 py-1">{t("tableGD")}</th>}
                      <th scope="col" className="px-2 py-1">{t("tablePts")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.team_id} className="border-t border-white/10">
                        <td className="px-2 py-1">{i + 1}</td>
                        <th scope="row" className="px-2 py-1 text-start font-medium">
                          <Link href={`/${sport}/teams/${row.team_id}`} className="flex items-center gap-2 hover:underline">
                            <TeamBadge name={row.team_name} logoUrl={row.logo_url} size={20} />
                            {row.team_name}
                            {row.team_is_real === false && <SimulatedBadge />}
                          </Link>
                        </th>
                        <td className="px-2 py-1 text-center">{row.played}</td>
                        <td className="px-2 py-1 text-center">{row.wins}</td>
                        {showDraws && <td className="px-2 py-1 text-center">{row.draws}</td>}
                        <td className="px-2 py-1 text-center">{row.losses}</td>
                        {showDraws && <td className="px-2 py-1 text-center">{row.goal_diff}</td>}
                        <td className="px-2 py-1 text-center font-bold">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="news" className="space-y-3">
          {!news && <Skeleton className="h-16 w-full" />}
          {news && news.length === 0 && <p className="text-white/70">{t("newsEmpty")}</p>}
          {news?.map((cluster) => (
            <Card key={cluster.id} variant="glass" className="p-4">
              <p className="font-medium text-white">{cluster.headline}</p>
              {cluster.summary && <p className="mt-1 text-sm text-white/70">{cluster.summary}</p>}
              {cluster.articles.length > 0 && (
                <p className="mt-1 truncate text-xs text-white/50">
                  {cluster.articles.map((a, i) => (
                    <span key={`${a.url}-${i}`}>
                      {i > 0 && " · "}
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
                        {a.source}
                      </a>
                    </span>
                  ))}
                  {" · "}
                  {timeAgo(cluster.updated_at, lang)}
                </p>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-3">
          {!transfers && <Skeleton className="h-16 w-full" />}
          {transfers && transfers.length === 0 && <p className="text-white/70">{t("transfersEmpty")}</p>}
          {transfers?.map((story) => (
            <Card key={story.id} variant="glass" className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white">
                  {story.player_name} {story.from_club ? `(${story.from_club} → ${story.to_club})` : `→ ${story.to_club}`}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="secondary">{t(transferStatusKey[story.status])}</Badge>
                  {story.estimated_probability != null && (
                    <Badge className="border-transparent bg-[var(--brand-accent)]/20 text-[var(--status-upcoming)]">
                      {story.estimated_probability}%
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-white/70">
                {story.ai_summary ?? `${story.from_club ? `${story.from_club} → ` : ""}${story.to_club}`}
              </p>
              {story.reports.length > 0 && (
                <p className="mt-1 truncate text-xs text-white/50">
                  {story.reports.map((r, i) => (
                    <span key={`${r.source_url}-${i}`}>
                      {i > 0 && " · "}
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
                        {r.source}
                      </a>
                    </span>
                  ))}
                  {" · "}
                  {timeAgo(story.updated_at, lang)}
                </p>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ai" className="space-y-3">
          {!games && <Skeleton className="h-20 w-full" />}
          {games && games.length === 0 && <p className="text-white/70">{t("noGames")}</p>}
          {games?.map((g) => (
            <GameCard key={g.id} game={g} sport={sport} t={t} />
          ))}
        </TabsContent>
      </Tabs>
    </ThemeLayout>
  );
}
