"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Bot,
  Newspaper,
  Settings,
  UserRound,
} from "lucide-react";

import { LangToggle, TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";

// Global nav shown on every page (Home, per-sport pages, Other Sports, and
// the 4 new modules that don't have real backend data yet — Transfer
// Center/News Center/AI Center/Profile/Settings are "coming soon" shells,
// see their page.tsx files). Per-sport pages layer ThemeLayout's own
// sport-badge row underneath this, they don't duplicate brand/lang-toggle.
const MODULE_LINKS: { href: string; labelKey: TKey; icon?: typeof ArrowLeftRight }[] = [
  { href: "/transfers", labelKey: "nav_transfers", icon: ArrowLeftRight },
  { href: "/news", labelKey: "nav_news", icon: Newspaper },
  { href: "/ai-center", labelKey: "nav_ai_center", icon: Bot },
  { href: "/profile", labelKey: "nav_profile", icon: UserRound },
  { href: "/settings", labelKey: "nav_settings", icon: Settings },
];

export function SiteHeader() {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white">
          SportsWorld
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {(Object.keys(sportsTheme) as SportKey[]).map((key) => (
            <Link
              key={key}
              href={`/${key}`}
              className="rounded-md px-2.5 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {sportsTheme[key].emoji} {t(`sport_${key}` as TKey)}
            </Link>
          ))}
          <Link
            href="/other-sports"
            className="rounded-md px-2.5 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            🏅 {t("otherSports")}
          </Link>
          {MODULE_LINKS.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <LangToggle />
      </div>
    </header>
  );
}
