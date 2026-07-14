"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLang } from "@/lib/i18n";

export interface Crumb {
  label: string;
  href: string;
}

// The design brief's breadcrumb + back bar, shown on every ThemeLayout
// screen (competitions/matches/match/player — Home and Settings use
// PageShell instead and never render this). The trail is real Next.js
// hrefs (not a reimplemented client-side history stack — the app already
// has one via next/navigation), and "Back" is router.back(), which behaves
// equivalently to the brief's history-pop for normal drill-down navigation.
export default function BreadcrumbBar({ crumbs }: { crumbs: Crumb[] }) {
  const { t } = useLang();
  const router = useRouter();

  return (
    <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-4 px-4 pt-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={`${crumb.href}-${i}`} className="flex items-center gap-2">
              {isLast ? (
                <span className="text-white/90">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="transition hover:text-[var(--brand-accent)]">
                  {crumb.label}
                </Link>
              )}
              {!isLast && <span className="opacity-35">›</span>}
            </span>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => router.back()}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        {t("back")}
      </button>
    </div>
  );
}
