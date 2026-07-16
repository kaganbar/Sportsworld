"use client";

import { useEffect } from "react";
import Link from "next/link";

import PageShell from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

// Next.js's App Router error boundary for this segment — without it, an
// unhandled render error anywhere in the app falls through to Next's own
// default error overlay (or a blank screen in production), same gap
// not-found.tsx just fixed for unmatched routes. `reset` re-renders the
// segment without a full page reload, per Next's error.tsx contract.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell maxWidth="max-w-2xl">
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <Card variant="glass" className="w-full">
          <CardContent className="flex flex-col items-center gap-4 p-10">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-bold leading-snug text-white">{t("errorTitle")}</h1>
            <p className="leading-relaxed text-white/70">{t("errorBody")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={reset}>{t("tryAgain")}</Button>
              <Button variant="outline" asChild>
                <Link href="/">{t("goHome")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
