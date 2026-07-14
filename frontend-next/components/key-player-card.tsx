"use client";

import Link from "next/link";

import { useLang } from "@/lib/i18n";

// Match-detail Overview tab's "Key Player" card — links through to the
// player profile screen. Avatar is a gradient placeholder (no photo assets
// in this app, matches the design brief's own "PLAYER PHOTO" mock).
export default function KeyPlayerCard({
  name,
  team,
  position,
  href,
}: {
  name: string;
  team: string;
  position: string;
  href: string;
}) {
  const { t, lang } = useLang();
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[20px] border border-[var(--brand-accent)]/25 bg-[linear-gradient(160deg,rgba(56,189,248,0.10),rgba(255,255,255,0.02))] p-5 backdrop-blur-xl transition hover:-translate-y-0.5"
    >
      <div className="h-[52px] w-[52px] shrink-0 rounded-full bg-[linear-gradient(135deg,var(--brand-accent),var(--ai-accent))]" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-bold tracking-wide text-[var(--status-upcoming)]">{t("keyPlayer")}</div>
        <div className="truncate text-[17px] font-bold text-white">{name}</div>
        <div className="truncate text-sm text-white/55">
          {team} · {position}
        </div>
      </div>
      {/* The "points toward more content" chevron flips with reading
          direction — same reasoning as BreadcrumbBar's arrow. */}
      <div className="shrink-0 text-xl text-[var(--status-upcoming)]">{lang === "he" ? "‹" : "›"}</div>
    </Link>
  );
}
