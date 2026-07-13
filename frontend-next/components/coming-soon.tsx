"use client";

import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TKey, useLang } from "@/lib/i18n";
import PageShell from "@/components/page-shell";

// Shared shell for the 4 new modules that don't have real backend data yet
// (Transfer Center/News Center/AI Center/Profile/Settings — Transfer/News
// agents are Phase 8, Auth is Phase 4). Same "coming soon" pattern the
// existing Other Sports page already uses for baseball/volleyball.
export function ComingSoonPage({ icon, titleKey, descriptionKey }: { icon: ReactNode; titleKey: TKey; descriptionKey: TKey }) {
  const { t } = useLang();
  return (
    <PageShell maxWidth="max-w-2xl">
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <Card variant="glass" className="w-full">
          <CardContent className="flex flex-col items-center gap-4 p-10">
            <div className="text-5xl">{icon}</div>
            <h1 className="text-2xl font-bold leading-snug text-white">{t(titleKey)}</h1>
            <Badge variant="secondary">{t("comingSoon")}</Badge>
            <p className="leading-relaxed text-white/70">{t(descriptionKey)}</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
