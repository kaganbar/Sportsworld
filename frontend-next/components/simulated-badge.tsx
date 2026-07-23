"use client";

import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n";

// The honest counterpart to TeamBadge's/PlayerProfileCard's "Verified"
// badge (green, marks real data) — this one flags the opposite: content
// from this app's own seeded/simulated pipeline (prisma/seed.ts), never
// from a live scraper/API. Muted/neutral on purpose (informational, not a
// warning) — same "never claim simulated content is real, but don't make
// it look broken either" philosophy as the rest of this app's mock-mode
// UI (e.g. the AI agents' own mock-mode responses).
export default function SimulatedBadge({ className }: { className?: string }) {
  const { t } = useLang();
  return (
    <Badge className={`border-transparent bg-white/10 text-white/60 ${className ?? ""}`}>{t("simulatedBadge")}</Badge>
  );
}
