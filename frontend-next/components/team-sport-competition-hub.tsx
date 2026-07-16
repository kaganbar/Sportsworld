"use client";

import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import GameCard from "@/components/game-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lang, useLang } from "@/lib/i18n";
import {
  Game,
  NewsArticle,
  TransferRumour,
  StandingsRow,
  fetchCompetitions,
  fetchStandings,
  fetchNews,
  fetchTransfers,
} from "@/lib/api";
import { competitionAccents } from "@/theme/sportsTheme";

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
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [transfers, setTransfers] = useState<TransferRumour[] | null>(null);

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
    fetchNews(30, sport, competition).then(setNews);
  }, [sport, lang, competition]);
  useEffect(() => {
    fetchTransfers(30, sport, competition).then(setTransfers);
  }, [sport, lang, competition]);

  const live = games?.filter((g) => g.status === "live") ?? [];
  const upcoming = games?.filter((g) => g.status !== "live") ?? [];

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
                      <th scope="col" className="px-2 py-1 text-start">Team</th>
                      <th scope="col" className="px-2 py-1">P</th>
                      <th scope="col" className="px-2 py-1">{t("winsAbbr")}</th>
                      {showDraws && <th scope="col" className="px-2 py-1">{t("drawsAbbr")}</th>}
                      <th scope="col" className="px-2 py-1">{t("lossesAbbr")}</th>
                      {showDraws && <th scope="col" className="px-2 py-1">GD</th>}
                      <th scope="col" className="px-2 py-1">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.team_id} className="border-t border-white/10">
                        <td className="px-2 py-1">{i + 1}</td>
                        <th scope="row" className="px-2 py-1 text-start font-medium">{row.team_name}</th>
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
          {news?.map((a) => (
            <Card key={a.id} variant="glass" className="p-4">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:underline">
                {a.title}
              </a>
              {a.summary && <p className="mt-1 text-sm text-white/70">{a.summary}</p>}
              <p className="mt-1 text-xs text-white/50">{a.source}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-3">
          {!transfers && <Skeleton className="h-16 w-full" />}
          {transfers && transfers.length === 0 && <p className="text-white/70">{t("transfersEmpty")}</p>}
          {transfers?.map((r) => (
            <Card key={r.id} variant="glass" className="p-4">
              <p className="font-medium text-white">
                {r.player_name} {r.from_club ? `(${r.from_club} → ${r.to_club})` : `→ ${r.to_club}`}
              </p>
              <p className="mt-1 text-sm text-white/70">{r.description}</p>
              <p className="mt-1 text-xs text-white/50">
                {r.source}
                {r.source_probability != null ? ` · ${r.source_probability}%` : ""}
              </p>
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
