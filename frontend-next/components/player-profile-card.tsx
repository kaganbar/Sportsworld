"use client";

import { useLang, translateFootballPosition } from "@/lib/i18n";
import { translateBasketballPosition } from "@/lib/positions";
import { Badge } from "@/components/ui/badge";

export interface PlayerStatChip {
  label: string;
  value: string | number;
}

// The design brief's Player profile screen: centered glass card, gradient
// avatar placeholder (no photo assets in this app — matches the brief's own
// "PLAYER PHOTO" monospace mock exactly), name, team · position, and up to
// 3 sport-relevant season-stat chips.
export default function PlayerProfileCard({
  name,
  team,
  position,
  sport,
  stats,
  isReal,
}: {
  name: string;
  team: string;
  position: string;
  // Optional/untyped-string (not PlayerProfile["sport"]) since this card
  // is reused by tennis (via a different props shape) too where "sport"
  // doesn't apply — see team-sport-player-profile.tsx's caller for the
  // real 4-sport union. Only gates which position-code vocabulary (if any)
  // gets translated; omitting it just leaves `position` untranslated.
  sport?: string;
  stats: PlayerStatChip[];
  isReal?: boolean;
}) {
  const { t, lang } = useLang();
  const displayPosition =
    sport === "basketball" ? translateBasketballPosition(lang, position) : translateFootballPosition(t, position);
  return (
    <div className="mx-auto max-w-[520px]">
      <div className="glass-panel rounded-[28px] p-10 text-center">
        <div className="mx-auto mb-6 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-accent),var(--ai-accent))] shadow-[0_0_40px_rgba(56,189,248,0.35)]">
          <span className="font-mono text-[11px] tracking-wide text-white/70">{t("playerPhoto")}</span>
        </div>
        <div className="mb-1.5 flex items-center justify-center gap-2 text-2xl font-extrabold text-white">
          {name}
          {isReal && (
            <Badge className="border-transparent bg-emerald-500/20 align-middle text-xs text-emerald-300">
              {t("verifiedPlayer")}
            </Badge>
          )}
        </div>
        <div className="mb-7 text-[15px] text-white/55">
          {team} · {displayPosition}
        </div>
        <div className="flex flex-wrap justify-center gap-3.5">
          {stats.map((s) => (
            <div key={s.label} className="min-w-[100px] rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <div className="text-xl font-extrabold text-white">{s.value}</div>
              <div className="mt-1 text-xs text-white/55">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
