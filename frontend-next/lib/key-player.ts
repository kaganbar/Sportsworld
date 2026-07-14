import { LineupEntry } from "./api";

export interface KeyPlayer {
  id: number;
  name: string;
  team: string;
  position: string;
}

// No backend "key player" selection exists (see redesign plan) — derived
// client-side instead: the first starting lineup player on whichever side
// `favorHome` picks (callers use the current score lead, or the higher-
// ranked player for tennis). Cheap, deterministic, and avoids a new agent
// call just to pick one name to feature.
export function deriveKeyPlayer(
  homeLineup: LineupEntry[],
  awayLineup: LineupEntry[],
  homeTeamName: string,
  awayTeamName: string,
  favorHome: boolean,
): KeyPlayer | null {
  const pool = favorHome ? homeLineup : awayLineup;
  const player = pool.find((p) => p.is_starting) ?? pool[0];
  if (!player) return null;
  return { id: player.id, name: player.name, team: favorHome ? homeTeamName : awayTeamName, position: player.position };
}
