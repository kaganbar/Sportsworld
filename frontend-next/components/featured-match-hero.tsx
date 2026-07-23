"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useLiveGame } from "@/hooks/useLiveGame";
import TeamBadge from "@/components/team-badge";
import SimulatedBadge from "@/components/simulated-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { sportsTheme } from "@/theme/sportsTheme";
import { FeedItem } from "@/lib/homeFeed";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// The homepage's headline element: the single most-relevant match across
// all 5 sports right now (see lib/homeFeed.ts's pickFeatured — live first,
// else soonest upcoming). `featured`/`loaded` come from app/page.tsx's one
// shared 5-sport fetch, so this component never fetches on its own.
export default function FeaturedMatchHero({ featured, loaded }: { featured: FeedItem | null; loaded: boolean }) {
  const { t } = useLang();
  const [live, setLive] = useState<FeedItem | null>(featured);

  useEffect(() => {
    setLive(featured);
  }, [featured?.sport, featured?.id]);

  useLiveGame(
    live?.status === "live" ? live.wsPath : null,
    (payload) =>
      setLive((prev) =>
        prev
          ? {
              ...prev,
              homeScore: payload.home_score ?? prev.homeScore,
              awayScore: payload.away_score ?? prev.awayScore,
              minute: payload.minute ?? prev.minute,
              status: payload.status ?? prev.status,
            }
          : prev,
      ),
  );

  if (!loaded) {
    return (
      <div className="px-2 pb-10 pt-8">
        <Skeleton className="mx-auto h-64 w-full max-w-3xl rounded-[28px]" />
      </div>
    );
  }

  // Empty state — genuinely no games today across any sport. Falls back to
  // the original static marketing hero rather than leaving a dead/empty card.
  if (!live) {
    return (
      <div className="px-2 pb-16 pt-8 text-center">
        <div className="mb-6 inline-block rounded-full border border-[var(--brand-accent)]/35 bg-[var(--brand-accent)]/[0.08] px-4 py-1.5 text-xs font-bold tracking-widest text-[var(--brand-accent)]">
          {t("heroKicker")}
        </div>
        <h1 className="mx-auto max-w-3xl bg-[linear-gradient(135deg,#ffffff,#a9d9ff_60%,#7c5cff)] bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/60">{t("heroSubtitle")}</p>
      </div>
    );
  }

  const theme = sportsTheme[live.sport];
  const isLive = live.status === "live";
  const isFinished = live.status === "finished";
  // Tennis has no score data at list level (matches components/match-card.tsx's
  // established behavior) — fall back to "vs" instead of a misleading "- : -".
  const hasScore = live.homeScore !== null || live.awayScore !== null;
  const statusLabel = isLive
    ? `${t("liveNow")}${live.minute != null ? ` · ${live.minute}'` : ""}`
    : isFinished
      ? t("statusFinished")
      : timeOf(live.time);
  const statusColorVar = isLive ? "var(--status-live)" : isFinished ? "var(--status-finished)" : "var(--status-upcoming)";
  const scoreKey = `${live.homeScore}-${live.awayScore}`;

  return (
    <div className="px-2 pb-10 pt-8">
      <Link href={live.href} className="mx-auto block max-w-3xl">
        <motion.div
          className="glass-panel rounded-[28px] p-8 text-center transition duration-300"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs font-bold tracking-widest text-[var(--brand-accent)]">
            <span aria-hidden="true">{theme.emoji}</span>
            <span className="uppercase">{live.competition}</span>
            {live.isReal === false && <SimulatedBadge />}
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-live)]/15 px-2.5 py-1 text-[var(--status-live)]">
                <span className="live-dot h-[7px] w-[7px] rounded-full bg-[var(--status-live)]" />
                {t("liveNow")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-10">
            <div className="flex flex-1 flex-col items-center gap-3">
              <TeamBadge name={live.homeName} logoUrl={live.homeLogo} color={live.homeColor} size={56} />
              <span className="text-base font-bold text-white sm:text-xl">{live.homeName}</span>
            </div>
            <motion.div
              key={scoreKey}
              dir="ltr"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex min-w-[96px] flex-col items-center gap-2"
            >
              <span className="text-3xl font-extrabold text-white sm:text-4xl">
                {live.status === "scheduled" ? timeOf(live.time) : hasScore ? `${live.homeScore ?? "-"} : ${live.awayScore ?? "-"}` : "vs"}
              </span>
              <span className="text-xs font-semibold" style={{ color: statusColorVar }}>
                {statusLabel}
              </span>
            </motion.div>
            <div className="flex flex-1 flex-col items-center gap-3">
              <TeamBadge name={live.awayName} logoUrl={live.awayLogo} color={live.awayColor} size={56} />
              <span className="text-base font-bold text-white sm:text-xl">{live.awayName}</span>
            </div>
          </div>
        </motion.div>
      </Link>
    </div>
  );
}
