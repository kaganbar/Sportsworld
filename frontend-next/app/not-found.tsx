"use client";

import Link from "next/link";

import PageShell from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

// Next.js renders this for any unmatched route instead of its bare,
// unstyled default ("404: This page could not be found.") — that default
// ignores the app's Hebrew/RTL default language and glass-panel design
// system entirely, unlike every other empty/error state in the app.
export default function NotFound() {
  const { t } = useLang();
  return (
    <PageShell maxWidth="max-w-2xl">
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <Card variant="glass" className="w-full">
          <CardContent className="flex flex-col items-center gap-4 p-10">
            <div className="text-5xl">🧭</div>
            <h1 className="text-2xl font-bold leading-snug text-white">{t("notFoundTitle")}</h1>
            <p className="leading-relaxed text-white/70">{t("notFoundBody")}</p>
            <Button asChild>
              <Link href="/">{t("goHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
