"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { Competition, fetchCompetitions, SportKey as ApiSportKey } from "@/lib/api";
import { competitionAccents } from "@/theme/sportsTheme";

// Shown at /football, /basketball, /tennis instead of a flat game list —
// picking a competition filters the whole hub (live/upcoming/standings/
// news/transfers/AI) down to just that one, rather than mixing every
// competition together (the concrete gap this component closes — see
// CLAUDE.md/the redesign plan for why the flat list wasn't enough).
export default function CompetitionPicker({ sport, basePath }: { sport: ApiSportKey; basePath: string }) {
  const { lang, t } = useLang();
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompetitions(sport, lang).then(setCompetitions).catch((e) => setError(String(e)));
  }, [sport, lang]);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold leading-snug text-white">{t("selectCompetition")}</h2>
      {error && <p className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      {!competitions && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {competitions?.map((c) => {
          const accent = competitionAccents[c.slug];
          return (
            <Link key={c.slug} href={`${basePath}/${c.slug}`}>
              <Card
                className="flex h-24 flex-col items-start justify-center gap-2 rounded-[20px] p-5 text-start transition duration-200 hover:-translate-y-1 hover:border-[var(--brand-accent)]/40"
                style={accent ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}33` } : undefined}
                variant="glass"
              >
                {/* line-clamp-2 + break-words: a long (esp. Hebrew) competition
                    name must wrap and clip gracefully within the fixed-height
                    tile, never overflow it. */}
                <span className="line-clamp-2 break-words text-[15px] font-bold leading-snug text-white">{c.name}</span>
                <span className="flex items-center gap-2 text-xs text-white/50">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-accent)]" />
                  {c.match_count} {t("matches")}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
