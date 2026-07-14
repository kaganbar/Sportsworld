"use client";

import { CSSProperties, ReactNode } from "react";

import { TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { HeaderBadge } from "@/components/header-badge";
import BreadcrumbBar, { Crumb } from "@/components/breadcrumb-bar";

// Sets the per-sport CSS variables; everything inside styles itself off
// them. The 3D canvas + scrim used to be mounted here, per-page — now the
// whole 3D world (three/PersistentWorld.tsx) is a single instance living
// in app/layout.tsx, persisting across navigation so WorldCameraRig can
// fly the camera between sports instead of the canvas unmounting/
// remounting. This component keeps only the badge + CSS vars + content
// wrapper. `competitionAccent`/`competitionLabel` are optional overrides
// for a competition hub page (e.g. Champions League's own blue/silver
// instead of generic football green) — additive, not a new 3D scene (see
// theme/sportsTheme.ts's competitionAccents comment).
export default function ThemeLayout({
  sport,
  competitionAccent,
  competitionLabel,
  breadcrumbExtra = [],
  children,
}: {
  sport: SportKey;
  competitionAccent?: string;
  competitionLabel?: string;
  // Additional crumbs beyond the always-present Home › Sport pair — e.g. a
  // competition hub page passes [{label: competitionName, href: pathname}],
  // a match page passes [...that, {label: "Home vs Away", href: pathname}].
  // The last crumb overall (extra's last item, or the sport itself if extra
  // is empty) renders as plain text, not a link — see BreadcrumbBar.
  breadcrumbExtra?: Crumb[];
  children: ReactNode;
}) {
  const theme = sportsTheme[sport];
  const { t } = useLang();
  const accent = competitionAccent ?? theme.accent;
  const crumbs: Crumb[] = [
    { label: t("home"), href: "/" },
    { label: t(`sport_${sport}` as TKey), href: `/${sport}` },
    ...breadcrumbExtra,
  ];
  return (
    <div
      className="relative z-0 min-h-screen pb-16"
      style={
        {
          "--sport-accent": accent,
          "--sport-accent-soft": theme.accentSoft,
          "--sport-glow": competitionAccent ?? theme.glow,
        } as CSSProperties
      }
    >
      <HeaderBadge icon={theme.emoji} label={t(`sport_${sport}` as TKey)} sub={competitionLabel} />
      <BreadcrumbBar crumbs={crumbs} />

      <div className="relative mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
