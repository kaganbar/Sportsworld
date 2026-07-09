const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Team {
  id: number;
  name: string;
  short_name: string;
  country: string;
  primary_color: string;
}

export interface Game {
  id: number;
  competition: string;
  kickoff: string;
  venue: string;
  status: "scheduled" | "live" | "finished";
  home_team: Team;
  away_team: Team;
  home_score: number | null;
  away_score: number | null;
}

export interface LineupEntry {
  name: string;
  shirt_number: number;
  position: string;
  is_starting: boolean;
}

export interface PastResult {
  date: string;
  competition: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
}

export interface FormStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
}

export interface InjuryEntry {
  player: string;
  status: string;
  reason: string;
}

export interface GameDetail {
  game: Game;
  lineups: { home: LineupEntry[]; away: LineupEntry[] };
  stats: { home: FormStats; away: FormStats };
  recent_form: { home: PastResult[]; away: PastResult[] };
  head_to_head: PastResult[];
  injuries: { home: InjuryEntry[]; away: InjuryEntry[] };
}

export interface Analysis {
  summary: string;
  key_factors: string[];
  probabilities: { home_win: number; draw: number; away_win: number };
  confidence: "low" | "medium" | "high";
  model: string;
  created_at: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const fetchTodaysGames = () => get<Game[]>("/api/games/today/");
export const fetchGameDetail = (id: string) => get<GameDetail>(`/api/games/${id}/`);
export const fetchAnalysis = (id: string, lang: "en" | "he" = "en") =>
  get<Analysis>(`/api/games/${id}/analysis/?lang=${lang}`);
