"use client";

// One proportion-bar row for the match-detail Overview tab — home value ·
// label · away value above a two-color bar, matching the design brief's
// Overview stat rows exactly (bar fill = brand accent for home, translucent
// white for away).
export default function StatBarRow({
  label,
  homeVal,
  awayVal,
  homePct,
  awayPct,
}: {
  label: string;
  homeVal: string;
  awayVal: string;
  homePct: number;
  awayPct: number;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex justify-between text-[13px] text-white/80">
        <span dir="ltr">{homeVal}</span>
        <span className="text-white/50">{label}</span>
        <span dir="ltr">{awayVal}</span>
      </div>
      <div className="flex h-1.5 gap-[3px] overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="rounded-full bg-[linear-gradient(90deg,var(--brand-accent),var(--brand-accent-2))]"
          style={{ width: `${homePct}%` }}
        />
        <div className="rounded-full bg-white/15" style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  );
}
