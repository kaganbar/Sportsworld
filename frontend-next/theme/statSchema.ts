import { TKey } from "@/lib/i18n";
import { GameStatsSide, TennisStatsSide } from "@/lib/api";

// Match-detail Overview tab stat-row schema, one per sport — mirrors the
// design brief's own `statSchema` almost exactly (label + optional "%"
// suffix), just driving real backend data (Game.stats/TennisMatch.stats)
// instead of the brief's mock numbers.
export interface StatRowSchema<T> {
  key: keyof T;
  labelKey: TKey;
  suffix?: string;
}

export const FOOTBALL_STAT_ROWS: StatRowSchema<GameStatsSide>[] = [
  { key: "possession", labelKey: "stat_possession", suffix: "%" },
  { key: "shots", labelKey: "stat_shots" },
  { key: "shotsOnTarget", labelKey: "stat_shotsOnTarget" },
  { key: "corners", labelKey: "stat_corners" },
];

export const BASKETBALL_STAT_ROWS: StatRowSchema<GameStatsSide>[] = [
  { key: "points", labelKey: "stat_points" },
  { key: "rebounds", labelKey: "stat_rebounds" },
  { key: "assists", labelKey: "stat_assists" },
  { key: "fgPct", labelKey: "stat_fgPct", suffix: "%" },
];

export const TENNIS_STAT_ROWS: StatRowSchema<TennisStatsSide>[] = [
  { key: "aces", labelKey: "stat_aces" },
  { key: "winners", labelKey: "stat_winners" },
  { key: "unforcedErrors", labelKey: "stat_unforcedErrors" },
  { key: "doubleFaults", labelKey: "stat_doubleFaults" },
];

export const BASEBALL_STAT_ROWS: StatRowSchema<GameStatsSide>[] = [
  { key: "hits", labelKey: "stat_hits" },
  { key: "runs", labelKey: "stat_runs" },
  { key: "errors", labelKey: "stat_errors" },
  { key: "walks", labelKey: "stat_walks" },
];

export const VOLLEYBALL_STAT_ROWS: StatRowSchema<GameStatsSide>[] = [
  { key: "kills", labelKey: "stat_kills" },
  { key: "digs", labelKey: "stat_digs" },
  { key: "blocks", labelKey: "stat_blocks" },
  { key: "aces", labelKey: "stat_aces" },
];
