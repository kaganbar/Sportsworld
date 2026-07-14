"use client";

import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import GameCard from "@/components/game-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import {
  Game,
  NewsArticle,
  TransferRumour,
  StandingsRow,
  fetchBasketballGames,
  fetchCompetitions,
  fetchStandings,
  fetchNews,
  fetchTransfers,
} from "@/lib/api";
import { competitionAccents } from "@/theme/sportsTheme";

export default function BasketballCompetitionHub({ params }: { params: { competition: string } }) {
  const { competition } = params;
  const { t, lang } = useLang();
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [games, setGames] = useState<Game[] | null>(null);
  const [standings, setStandings] = useState<StandingsRow[] | null>(null);
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [transfers, setTransfers] = useState<TransferRumour[] | null>(null);

  useEffect(() => {
    fetchCompetitions("basketball", lang).then((list) => setLabel(list.find((c) => c.slug === competition)?.name));
  }, [competition, lang]);
  useEffect(() => {
    fetchBasketballGames(lang, competition).then(setGames);
  }, [lang, competition]);
  useEffect(() => {
    fetchStandings("basketball", competition, lang).then(setStandings);
  }, [lang, competition]);
  useEffect(() => {
    fetchNews(30, "basketball", competition).then(setNews);
  }, [lang, competition]);
  useEffect(() => {
    fetchTransfers(30, "basketball", competition).then(setTransfers);
  }, [lang, competition]);

  const live = games?.filter((g) => g.status === "live") ?? [];
  const upcoming = games?.filter((g) => g.status !== "live") ?? [];

  return (
    <ThemeLayout
      sport="basketball"
      competitionAccent={competitionAccents[competition]}
      competitionLabel={label}
      breadcrumbExtra={label ? [{ label, href: `/basketball/${competition}` }] : []}
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
            <GameCard key={g.id} game={g} sport="basketball" t={t} />
          ))}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {!games && <Skeleton className="h-20 w-full" />}
          {games && upcoming.length === 0 && <p className="text-white/70">{t("noUpcomingGames")}</p>}
          {upcoming.map((g) => (
            <GameCard key={g.id} game={g} sport="basketball" t={t} />
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
                      <th className="px-2 py-1 text-start">#</th>
                      <th className="px-2 py-1 text-start">Team</th>
                      <th className="px-2 py-1">P</th>
                      <th className="px-2 py-1">{t("winsAbbr")}</th>
                      <th className="px-2 py-1">{t("lossesAbbr")}</th>
                      <th className="px-2 py-1">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.team_id} className="border-t border-white/10">
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1 text-start font-medium">{row.team_name}</td>
                        <td className="px-2 py-1 text-center">{row.played}</td>
                        <td className="px-2 py-1 text-center">{row.wins}</td>
                        <td className="px-2 py-1 text-center">{row.losses}</td>
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
            <GameCard key={g.id} game={g} sport="basketball" t={t} />
          ))}
        </TabsContent>
      </Tabs>
    </ThemeLayout>
  );
}
