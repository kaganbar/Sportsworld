"use client";

import Link from "next/link";
import { LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/i18n";
import { SPORT_ORDER, sportsTheme } from "@/theme/sportsTheme";
import { Skeleton } from "./skeleton";

/**
 * Profile — real auth state over the Google-OAuth backend (via useAuth):
 *   loading  → skeleton
 *   signed-out → intro + "Sign in with Google" (redirects to /api/auth/google)
 *   signed-in  → avatar, name, email, sign-out
 * The sport quick-links show in both states so the page is useful either way.
 */
export function ProfilePanel() {
  const { t } = useLang();
  const { me, loading, login, logout } = useAuth();

  return (
    <div className="flex flex-col gap-8">
      {loading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3.5 w-52" />
          </div>
        </div>
      ) : me ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {me.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar_url} alt="" width={80} height={80} className="h-20 w-20 rounded-full object-cover ring-1 ring-inset ring-white/10" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/5 text-[color:var(--chalk-dim)] ring-1 ring-inset ring-white/10">
                <User size={40} />
              </span>
            )}
            <div>
              <p className="text-sm text-[color:var(--chalk-dim)]">{t("welcomeBack")}</p>
              <p className="font-display text-3xl tracking-wide text-[color:var(--chalk)]">{me.name}</p>
              <p className="text-sm text-[color:var(--chalk-dim)]">{me.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-[color:var(--chalk)] transition-colors hover:bg-white/5"
          >
            <LogOut size={16} />
            {t("signOut")}
          </button>
          <p className="max-w-lg text-sm text-[color:var(--chalk-dim)]">{t("profileNote")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-5">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white/5 text-[color:var(--chalk-dim)] ring-1 ring-inset ring-white/10">
            <User size={40} />
          </span>
          <p className="max-w-lg text-sm leading-relaxed text-[color:var(--chalk-dim)]">{t("desc_profile")}</p>
          <button
            type="button"
            onClick={login}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-accent)] px-6 py-2.5 text-sm font-bold text-[#06140c] transition-opacity hover:opacity-90"
          >
            <LogIn size={16} />
            {t("signInWithGoogle")}
          </button>
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--chalk-dim)]">
          {t("todaysGames")}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SPORT_ORDER.map((key) => {
            const s = sportsTheme[key];
            return (
              <Link
                key={key}
                href={s.route}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl text-xl" style={{ background: `${s.accent}14` }}>
                  {s.icon}
                </span>
                <span className="font-medium text-[color:var(--chalk)]">{t(s.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
