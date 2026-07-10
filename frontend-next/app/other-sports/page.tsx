"use client";

import Link from "next/link";

import { TKey, useLang } from "@/lib/i18n";
import { OtherSportKey, otherSportsTheme } from "@/theme/sportsTheme";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OtherSports() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-center">
      <Link href="/" className="mb-4 inline-block text-sm text-white/80 hover:text-white">
        {t("backToSports")}
      </Link>
      <h1 className="mb-6 text-2xl font-bold">{t("otherSports")}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {(Object.keys(otherSportsTheme) as OtherSportKey[]).map((key) => {
          const theme = otherSportsTheme[key];
          return (
            <Card
              key={key}
              className="relative flex h-32 flex-col items-center justify-center gap-2 border-0 text-white"
              style={{ background: theme.background }}
            >
              <span className="text-3xl">{theme.emoji}</span>
              <span className="font-semibold">{t(`sport_${key}` as TKey)}</span>
              <Badge variant="secondary" className="absolute bottom-2 right-2">
                {t("comingSoon")}
              </Badge>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
