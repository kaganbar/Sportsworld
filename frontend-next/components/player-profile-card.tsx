"use client";

import { useLang } from "@/lib/i18n";

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
  stats,
}: {
  name: string;
  team: string;
  position: string;
  stats: PlayerStatChip[];
}) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-[520px]">
      <div className="glass-panel rounded-[28px] p-10 text-center">
        <div className="mx-auto mb-6 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-accent),var(--ai-accent))] shadow-[0_0_40px_rgba(56,189,248,0.35)]">
          <span className="font-mono text-[11px] tracking-wide text-white/70">{t("playerPhoto")}</span>
        </div>
        <div className="mb-1.5 text-2xl font-extrabold text-white">{name}</div>
        <div className="mb-7 text-[15px] text-white/55">
          {team} · {position}
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
