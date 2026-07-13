"use client";

import { useEffect, useState } from "react";

import { useLang } from "@/lib/i18n";
import { TransferRumour, fetchTransfers } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ComingSoonPage } from "@/components/coming-soon";
import PageShell from "@/components/page-shell";

// A neutral "transfer market" accent (amber/gold) — Transfers spans every
// sport, so it deliberately doesn't borrow any one sport's theme color, but
// still drives the shared --sport-accent/--sport-glow CSS vars the same way
// ThemeLayout does, so shadow-glow and the glass utilities read consistently.
const ACCENT = "#d4a017";

function timeAgo(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransfersPage() {
  const { t, lang } = useLang();
  const [rumours, setRumours] = useState<TransferRumour[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTransfers(30)
      .then(setRumours)
      .catch(() => setError(true));
  }, []);

  // No source chosen/reachable — same "coming soon" shell every other new module uses.
  if (error || rumours?.length === 0) {
    return <ComingSoonPage icon="⇄" titleKey="nav_transfers" descriptionKey="desc_transfers" />;
  }

  return (
    <PageShell accent={ACCENT} icon="⇄" label={t("nav_transfers")}>
      <h1 className="mb-1 text-2xl font-bold leading-snug text-white">{t("nav_transfers")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/60">{t("transfersRawNote")}</p>

      {!rumours && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      <div className="space-y-3">
        {rumours?.map((rumour) => (
          <a key={rumour.id} href={rumour.source_url} target="_blank" rel="noopener noreferrer">
            <Card variant="glass" className="p-4 transition hover:shadow-glow">
              <div className="mb-1 flex items-center justify-between text-xs text-white/50">
                <span>
                  {rumour.source} · {timeAgo(rumour.reported_at, lang)}
                </span>
                {rumour.source_probability != null && (
                  <Badge className="border-transparent bg-[var(--sport-accent)]/20 text-[var(--sport-accent)]">
                    {rumour.source_probability}%
                  </Badge>
                )}
              </div>
              <CardContent className="p-0">
                <h2 className="font-semibold text-white">{rumour.player_name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  {rumour.from_club ? `${rumour.from_club} → ` : ""}
                  {rumour.description}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
