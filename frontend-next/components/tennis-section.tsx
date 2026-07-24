"use client";

import { useEffect, useMemo, useState } from "react";
import { TennisMatch, fetchTennisMatches } from "@/lib/api";
import { CalendarX2, WifiOff } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { EmptyState } from "./empty-state";
import { MatchCard } from "./match-card";
import { CardGridSkeleton } from "./skeleton";

type Tab = "live" | "upcoming" | "finished";

/**
 * Today's tennis matches: Live / Upcoming / Finished tabs over a card grid.
 * Same fetch-on-mount + 20s poll + auto-tab behavior as GamesSection, but over
 * the tennis match shape (player vs player, no list-level score).
 */
export function TennisSection() {
  const { lang, t } = useLang();
  const [matches, setMatches] = useState<TennisMatch[] | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("live");
  const [tabTouched, setTabTouched] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchTennisMatches(lang);
        if (alive) {
          setMatches(data);
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
  }, [lang]);

  const groups = useMemo(() => {
    const m = matches ?? [];
    return {
      live: m.filter((x) => x.status === "live"),
      upcoming: m.filter((x) => x.status === "scheduled"),
      finished: m.filter((x) => x.status === "finished"),
    };
  }, [matches]);

  useEffect(() => {
    if (tabTouched || !matches) return;
    if (groups.live.length) setTab("live");
    else if (groups.upcoming.length) setTab("upcoming");
    else if (groups.finished.length) setTab("finished");
  }, [matches, groups, tabTouched]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "live", label: t("tab_live"), count: groups.live.length },
    { key: "upcoming", label: t("tab_upcoming"), count: groups.upcoming.length },
    { key: "finished", label: t("statusFinished"), count: groups.finished.length },
  ];

  if (error) {
    return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGames")} />;
  }
  if (!matches) {
    return <CardGridSkeleton />;
  }

  const shown = groups[tab];
  const emptyMsg =
    tab === "live" ? t("noLiveGames") : tab === "upcoming" ? t("noUpcomingGames") : t("noGames");

  return (
    <div className="flex flex-col gap-5">
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
          {shown.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
