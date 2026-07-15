"use client";

import ThemeLayout from "@/components/theme-layout";
import CompetitionPicker from "@/components/competition-picker";
import { useLang } from "@/lib/i18n";

export default function BaseballGames() {
  const { t } = useLang();
  return (
    <ThemeLayout sport="baseball">
      {/* Unlike football/basketball/tennis (which can pull real scraped
          fixtures from 365scores.com), baseball has no real data source —
          always simulated. Disclosed so a user never mistakes this for a
          live MLB schedule, same transparency spirit as transfersRawNote/
          newsRawNote's "raw, not yet processed" disclosures. */}
      <p className="mb-4 text-sm leading-relaxed text-white/60">{t("simulatedDataNote")}</p>
      <CompetitionPicker sport="baseball" basePath="/baseball" />
    </ThemeLayout>
  );
}
