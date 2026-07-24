"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLang();
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-7xl text-[color:var(--brand-accent)]">404</p>
      <h1 className="font-display text-3xl tracking-wide text-[color:var(--chalk)]">
        {t("notFoundTitle")}
      </h1>
      <p className="max-w-md text-[color:var(--chalk-dim)]">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-[color:var(--brand-accent)] px-6 py-2.5 text-sm font-bold text-[#06140c] transition-opacity hover:opacity-90"
      >
        {t("goHome")}
      </Link>
    </main>
  );
}
