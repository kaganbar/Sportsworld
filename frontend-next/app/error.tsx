"use client";

import { useLang } from "@/lib/i18n";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl tracking-wide text-[color:var(--chalk)]">
        {t("errorTitle")}
      </h1>
      <p className="max-w-md text-[color:var(--chalk-dim)]">{t("errorBody")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-full bg-[color:var(--brand-accent)] px-6 py-2.5 text-sm font-bold text-[#06140c] transition-opacity hover:opacity-90"
      >
        {t("tryAgain")}
      </button>
    </main>
  );
}
