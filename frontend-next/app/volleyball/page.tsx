"use client";

import ThemeLayout from "@/components/theme-layout";
import CompetitionPicker from "@/components/competition-picker";
import { useLang } from "@/lib/i18n";

export default function VolleyballGames() {
  const { t } = useLang();
  return (
    <ThemeLayout sport="volleyball">
      {/* See BaseballGames' identical note for why: no real scraper source
          exists for this sport, unlike football/basketball/tennis. */}
      <p className="mb-4 text-sm leading-relaxed text-white/60">{t("simulatedDataNote")}</p>
      <CompetitionPicker sport="volleyball" basePath="/volleyball" />
    </ThemeLayout>
  );
}
