"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Game,
  fetchBaseballGames,
  fetchBasketballGames,
  fetchTodaysGames,
  fetchVolleyballGames,
} from "@/lib/api";
import { CalendarX2, WifiOff } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { SportKey } from "@/theme/sportsTheme";
import { EmptyState } from "./empty-state";
import { GameCard } from "./game-card";
import { CardGridSkeleton } from "./skeleton";

type TeamSportKey = Exclude<SportKey, "tennis">;

const FETCHERS: Record<TeamSportKey, (lang: "en" | "he") => Promise<Game[]>> = {
  football: (lang) => fetchTodaysGames(lang),
  basketball: (lang) => fetchBasketballGames(lang),
  baseball: (lang) => fetchBaseballGames(lang),
  volleyball: (lang) => fetchVolleyballGames(lang),
};

type Tab = "live" | "upcoming" | "finished";

/**
 * Today's fixtures for one team sport: Live / Upcoming / Finished tabs over a
 * responsive card grid. Fetches on mount + language change, and polls every
 * 20s so live scores/minutes stay fresh without a WebSocket per card. Defaults
 * to whichever tab has content (live → upcoming → finished).
 */
export function GamesSection({ sport }: { sport: TeamSportKey }) {
  const { lang, t } = useLang();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("live");
  const [tabTouched, setTabTouched] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await FETCHERS[sport](lang);
        if (alive) {
          setGames(data);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const iv = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [sport, lang]);

  const groups = useMemo(() => {
    const g = games ?? [];
    return {
      live: g.filter((x) => x.status === "live"),
      upcoming: g.filter((x) => x.status === "scheduled"),
      finished: g.filter((x) => x.status === "finished"),
    };
  }, [games]);

  // Auto-select the first non-empty tab until the user picks one themselves.
  useEffect(() => {
    if (tabTouched || !games) return;
    if (groups.live.length) setTab("live");
    else if (groups.upcoming.length) setTab("upcoming");
    else if (groups.finished.length) setTab("finished");
  }, [games, groups, tabTouched]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "live", label: t("tab_live"), count: groups.live.length },
    { key: "upcoming", label: t("tab_upcoming"), count: groups.upcoming.length },
    { key: "finished", label: t("statusFinished"), count: groups.finished.length },
  ];

  if (error) {
    return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGames")} />;
  }
  if (!games) {
    return <CardGridSkeleton />;
  }

  const shown = groups[tab];
  const emptyMsg =
    tab === "live" ? t("noLiveGames") : tab === "upcoming" ? t("noUpcomingGames") : t("noGames");

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => {
                setTab(tb.key);
                setTabTouched(true);
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[color:var(--brand-accent)] text-[#06140c]"
                  : "bg-white/5 text-[color:var(--chalk-dim)] hover:text-[color:var(--chalk)]"
              }`}
            >
              {tb.label}
              {tb.count > 0 && <span className="ms-1.5 opacity-70">{tb.count}</span>}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<CalendarX2 size={24} />} message={emptyMsg} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((game) => (
            <GameCard key={game.id} sport={sport} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
