import type { Lang } from "./i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

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
  minute: number | null;
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

export const fetchTodaysGames = (lang: Lang = "en") =>
  get<Game[]>(`/api/games/today/?sport=football&lang=${lang}`);
export const fetchGameDetail = (id: string, lang: Lang = "en") =>
  get<GameDetail>(`/api/games/${id}/?lang=${lang}`);
export const fetchAnalysis = (id: string, lang: "en" | "he" = "en") =>
  get<Analysis>(`/api/games/${id}/analysis/?lang=${lang}`);

// --- Basketball ---

export interface QuarterScore {
  quarter: number;
  home_score: number;
  away_score: number;
}

export interface BasketballGameDetail {
  game: Game;
  quarters: QuarterScore[];
  lineups: { home: LineupEntry[]; away: LineupEntry[] };
  stats: { home: FormStats; away: FormStats };
  recent_form: { home: PastResult[]; away: PastResult[] };
  head_to_head: PastResult[];
  injuries: { home: InjuryEntry[]; away: InjuryEntry[] };
}

export interface BasketballAnalysis {
  summary: string;
  key_factors: string[];
  probabilities: { home_win: number; away_win: number };
  confidence: "low" | "medium" | "high";
  model: string;
  created_at: string;
}

export const fetchBasketballGames = (lang: Lang = "en") =>
  get<Game[]>(`/api/games/today/?sport=basketball&lang=${lang}`);
export const fetchBasketballGameDetail = (id: string, lang: Lang = "en") =>
  get<BasketballGameDetail>(`/api/basketball/games/${id}/?lang=${lang}`);
export const fetchBasketballAnalysis = (id: string, lang: "en" | "he" = "en") =>
  get<BasketballAnalysis>(`/api/basketball/games/${id}/analysis/?lang=${lang}`);

// --- Tennis ---

export interface TennisPlayer {
  id: number;
  name: string;
  country: string;
  tour: "atp" | "wta";
  ranking: number | null;
}

export interface TennisMatch {
  id: number;
  tour: "atp" | "wta";
  tournament: string;
  round: string;
  venue: string;
  start_time: string;
  status: "scheduled" | "live" | "finished";
  player1: TennisPlayer;
  player2: TennisPlayer;
  winner_id: number | null;
}

export interface TennisSet {
  set_number: number;
  player1_games: number;
  player2_games: number;
}

export interface TennisFormStats {
  played: number;
  wins: number;
  losses: number;
}

export interface TennisMatchResult {
  start_time: string;
  tournament: string;
  round: string;
  player1: string;
  player2: string;
  winner: string | null;
  sets: TennisSet[];
}

export interface TennisMatchDetail {
  match: TennisMatch;
  sets: TennisSet[];
  stats: { player1: TennisFormStats; player2: TennisFormStats };
  recent_form: { player1: TennisMatchResult[]; player2: TennisMatchResult[] };
  head_to_head: TennisMatchResult[];
}

export interface TennisAnalysis {
  summary: string;
  key_factors: string[];
  probabilities: { player1_win: number; player2_win: number };
  confidence: "low" | "medium" | "high";
  model: string;
  created_at: string;
}

export const fetchTennisMatches = (lang: Lang = "en") =>
  get<TennisMatch[]>(`/api/tennis/matches/today/?lang=${lang}`);
export const fetchTennisMatchDetail = (id: string, lang: Lang = "en") =>
  get<TennisMatchDetail>(`/api/tennis/matches/${id}/?lang=${lang}`);
export const fetchTennisAnalysis = (id: string, lang: "en" | "he" = "en") =>
  get<TennisAnalysis>(`/api/tennis/matches/${id}/analysis/?lang=${lang}`);
