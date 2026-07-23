"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import ThemeLayout from "@/components/theme-layout";
import TeamBadge from "@/components/team-badge";
import SimulatedBadge from "@/components/simulated-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { SportKey } from "@/theme/sportsTheme";
import { TeamRoster, fetchTeamRoster } from "@/lib/api";

// Same card-press spring as components/game-card.tsx — one shared feel for
// every clickable card across the app, not a bespoke one per component.
const CARD_SPRING = { type: "spring", stiffness: 400, damping: 25 } as const;

// Shared by the 4 team sports' [teamId] roster pages (football/basketball/
// baseball/volleyball) — same "thin sport-specific wrapper" pattern as
// TeamSportPlayerProfile. Tennis has no team concept, so no tennis variant.
//
// `is_real` players (see prisma's enrich-real-players.ts / enrich-football-
// data-squads.ts / enrich-balldontlie-rosters.ts) get a "Verified" badge —
// added specifically because a handful of teams carry a blended roster
// (this app's original fictional squad plus real players added later,
// where a real club's name happened to collide with a pre-existing
// fictional one, e.g. the Lakers), so without a visible marker there's no
// way to tell which names on the same list are sourced from a real
// provider vs. this app's own mock data.
export default function TeamSportRoster({ teamId, sport }: { teamId: string; sport: SportKey }) {
  const { t, lang } = useLang();
  const [data, setData] = useState<TeamRoster | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    fetchTeamRoster(teamId, lang).then(setData).catch((e) => setError(String(e)));
  }, [teamId, lang]);

  return (
    <ThemeLayout sport={sport} breadcrumbExtra={data ? [{ label: data.team.name, href: `/${sport}/teams/${teamId}` }] : []}>
      {error && <p role="alert" className="mx-auto max-w-2xl rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}

      {!data && !error && (
        <div className="mx-auto max-w-2xl">
          <div className="glass-panel mb-6 flex items-center gap-4 rounded-[28px] p-6">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="mb-3 h-4 w-20" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-[16px]" />
            ))}
          </div>
        </div>
      )}

      {data && (
        <div className="mx-auto max-w-2xl">
          {/* Hero header — glass panel + the sport's own ambient accent glow
              (--sport-accent/--sport-glow, set by ThemeLayout), same wayfinding
              tint every other per-sport surface in this app uses. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass-panel relative mb-6 overflow-hidden rounded-[28px] p-6"
          >
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-40"
              style={{ background: "radial-gradient(circle at 15% 20%, var(--sport-glow), transparent 60%)" }}
            />
            <div className="flex items-center gap-4">
              <TeamBadge name={data.team.name} logoUrl={data.team.logo_url} size={56} />
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold leading-snug text-white">
                  {data.team.name}
                  {!data.team.is_real && <SimulatedBadge />}
                </h1>
                {data.team.coach_name && (
                  <p className="text-sm text-white/60">
                    {t("coach")}: <span className="text-white/80">{data.team.coach_name}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">{t("squad")}</h2>

          {data.players.length === 0 && <p className="text-white/70">{t("noRosterData")}</p>}

          <div className="space-y-2">
            {data.players.map((p, i) => (
              <Link key={p.id} href={`/${sport}/players/${p.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  // Capped stagger delay — a 40-player squad shouldn't take
                  // visibly longer to finish revealing than an 11-player one.
                  transition={{ ...CARD_SPRING, delay: Math.min(i * 0.03, 0.6) }}
                >
                  <Card variant="glass" className="flex items-center gap-3 p-3 transition-colors hover:border-[var(--brand-accent)]/40">
                    <span dir="ltr" className="w-8 shrink-0 text-center text-sm font-bold text-white/40">
                      {p.shirt_number ?? "-"}
                    </span>
                    <CardContent className="flex flex-1 items-center justify-between gap-2 p-0">
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-white/50">{p.position}</span>
                        {p.is_real && (
                          <Badge className="border-transparent bg-emerald-500/20 text-emerald-300">
                            {t("verifiedPlayer")}
                          </Badge>
                        )}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </ThemeLayout>
  );
}
