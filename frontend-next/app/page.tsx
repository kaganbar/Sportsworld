"use client";

import Link from "next/link";

import { TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { t } = useLang();
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div>
        <h1 className="text-4xl font-extrabold">SportsWorld</h1>
        <p className="mt-2 text-muted-foreground">{t("tagline")}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
        {(Object.keys(sportsTheme) as SportKey[]).map((key) => {
          const theme = sportsTheme[key];
          const tile = (
            <Card
              className="relative flex h-32 flex-col items-center justify-center gap-2 overflow-hidden border-0 text-white transition hover:scale-[1.02]"
              style={{ background: theme.background }}
            >
              <span className="text-3xl">{theme.emoji}</span>
              <span className="font-semibold">{t(`sport_${key}` as TKey)}</span>
              {!theme.available && (
                <Badge variant="secondary" className="absolute bottom-2 right-2">
                  {t("comingSoon")}
                </Badge>
              )}
            </Card>
          );
          return theme.available ? (
            <Link key={key} href={`/${key}`}>
              {tile}
            </Link>
          ) : (
            <div key={key}>{tile}</div>
          );
        })}
        <Link href="/other-sports">
          <Card className="flex h-32 flex-col items-center justify-center gap-2 border-0 bg-gradient-to-br from-slate-700 to-slate-900 text-white transition hover:scale-[1.02]">
            <span className="text-3xl">🏅</span>
            <span className="font-semibold">{t("otherSports")}</span>
          </Card>
        </Link>
      </div>
    </main>
  );
}
