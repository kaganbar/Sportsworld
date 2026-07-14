"use client";

import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import MatchCard from "@/components/match-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import {
  TennisMatch,
  NewsArticle,
  RankingEntry,
  fetchTennisMatches,
  fetchCompetitions,
  fetchRankings,
  fetchNews,
} from "@/lib/api";
import { competitionAccents } from "@/theme/sportsTheme";

// Only the tour-wide buckets have a "rankings" concept — Slam/event
// competitions (Wimbledon, Davis Cup, ...) show Live/Upcoming/News/AI only,
// no table (see standings.service.ts's rankings() comment).
const RANKED_TOURS: Record<string, "atp" | "wta"> = {
  "atp-tour": "atp",
  "wta-tour": "wta",
};

export default function TennisCompetitionHub({ params }: { params: { competition: string } }) {
  const { competition } = params;
  const { t, lang } = useLang();
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [matches, setMatches] = useState<TennisMatch[] | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[] | null>(null);
  const [news, setNews] = useState<NewsArticle[] | null>(null);

  const tour = RANKED_TOURS[competition];

  useEffect(() => {
    fetchCompetitions("tennis", lang).then((list) => setLabel(list.find((c) => c.slug === competition)?.name));
  }, [competition, lang]);
  useEffect(() => {
    fetchTennisMatches(lang, competition).then(setMatches);
  }, [lang, competition]);
  useEffect(() => {
    if (tour) fetchRankings(tour, lang).then(setRankings);
  }, [tour, lang]);
  useEffect(() => {
    fetchNews(30, "tennis", competition).then(setNews);
  }, [lang, competition]);

  const live = matches?.filter((m) => m.status === "live") ?? [];
  const upcoming = matches?.filter((m) => m.status !== "live") ?? [];

  return (
    <ThemeLayout
      sport="tennis"
      competitionAccent={competitionAccents[competition]}
      competitionLabel={label}
      breadcrumbExtra={label ? [{ label, href: `/tennis/${competition}` }] : []}
    >
      <Tabs defaultValue="live" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="live">{t("tab_live")}</TabsTrigger>
          <TabsTrigger value="upcoming">{t("tab_upcoming")}</TabsTrigger>
          {tour && <TabsTrigger value="rankings">{t("tab_rankings")}</TabsTrigger>}
          <TabsTrigger value="news">{t("tab_news")}</TabsTrigger>
          <TabsTrigger value="ai">{t("tab_ai")}</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-3">
          {!matches && <Skeleton className="h-20 w-full" />}
          {matches && live.length === 0 && <p className="text-white/70">{t("noLiveGames")}</p>}
          {live.map((m) => (
            <MatchCard key={m.id} match={m} t={t} />
          ))}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {!matches && <Skeleton className="h-20 w-full" />}
          {matches && upcoming.length === 0 && <p className="text-white/70">{t("noUpcomingGames")}</p>}
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m} t={t} />
          ))}
        </TabsContent>

        {tour && (
          <TabsContent value="rankings">
            {!rankings && <Skeleton className="h-40 w-full" />}
            {rankings && rankings.length === 0 && <p className="text-white/70">{t("noRankingsData")}</p>}
            {rankings && rankings.length > 0 && (
              <Card variant="glass">
                <CardContent className="overflow-x-auto p-4">
                  <table className="w-full text-sm" dir="ltr">
                    <thead>
                      <tr className="text-white/60">
                        <th className="px-2 py-1 text-start">#</th>
                        <th className="px-2 py-1 text-start">Player</th>
                        <th className="px-2 py-1 text-start">Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((p) => (
                        <tr key={p.id} className="border-t border-white/10">
                          <td className="px-2 py-1">{p.ranking}</td>
                          <td className="px-2 py-1 text-start font-medium">{p.name}</td>
                          <td className="px-2 py-1 text-start">{p.country}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

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

        <TabsContent value="ai" className="space-y-3">
          {!matches && <Skeleton className="h-20 w-full" />}
          {matches && matches.length === 0 && <p className="text-white/70">{t("noGames")}</p>}
          {matches?.map((m) => (
            <MatchCard key={m.id} match={m} t={t} />
          ))}
        </TabsContent>
      </Tabs>
    </ThemeLayout>
  );
}
