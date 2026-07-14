import type { Lang } from "./i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export type SportKey = "football" | "basketball" | "tennis";

const competitionQuery = (competition?: string) => (competition ? `&competition=${competition}` : "");

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
  id: number;
  name: string;
  shirt_number: number;
  position: string;
  is_starting: boolean;
  team_id: number;
}

// Match-detail Overview tab proportion-bar data. Loose/optional-keyed
// (rather than a discriminated union) since the consumer already knows
// which sport it's on and reads only the relevant keys per a statSchema-like
// row list, mirroring the design brief's own statSchema.
export interface GameStatsSide {
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  corners?: number;
  points?: number;
  rebounds?: number;
  assists?: number;
  fgPct?: number;
}
export interface GameStats {
  home: GameStatsSide;
  away: GameStatsSide;
}

export interface TennisStatsSide {
  aces: number;
  winners: number;
  unforcedErrors: number;
  doubleFaults: number;
}
export interface TennisMatchStats {
  home: TennisStatsSide;
  away: TennisStatsSide;
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
  game_stats: GameStats | null;
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

export const fetchTodaysGames = (lang: Lang = "en", competition?: string) =>
  get<Game[]>(`/api/games/today/?sport=football&lang=${lang}${competitionQuery(competition)}`);
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
  game_stats: GameStats | null;
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

export const fetchBasketballGames = (lang: Lang = "en", competition?: string) =>
  get<Game[]>(`/api/games/today/?sport=basketball&lang=${lang}${competitionQuery(competition)}`);
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
  match_stats: TennisMatchStats | null;
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

export const fetchTennisMatches = (lang: Lang = "en", competition?: string) =>
  get<TennisMatch[]>(`/api/tennis/matches/today/?lang=${lang}${competitionQuery(competition)}`);
export const fetchTennisMatchDetail = (id: string, lang: Lang = "en") =>
  get<TennisMatchDetail>(`/api/tennis/matches/${id}/?lang=${lang}`);
export const fetchTennisAnalysis = (id: string, lang: "en" | "he" = "en") =>
  get<TennisAnalysis>(`/api/tennis/matches/${id}/analysis/?lang=${lang}`);

// --- News (Phase 6 — raw ingested headlines, no AI summarization/dedup yet) ---

export interface NewsArticle {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  published_at: string;
  source: string;
}

export const fetchNews = (limit = 30, sport?: SportKey, competition?: string) =>
  get<NewsArticle[]>(`/api/news?limit=${limit}${sport ? `&sport=${sport}` : ""}${competitionQuery(competition)}`);

// --- Transfers (Phase 6 — raw ingested rumors, no story-grouping/dedup or our own probability estimate yet) ---

export interface TransferRumour {
  id: number;
  player_name: string;
  from_club: string | null;
  to_club: string;
  status: "rumor" | "official" | "completed" | "denied";
  description: string;
  source: string;
  source_url: string;
  source_probability: number | null;
  reported_at: string;
}

export const fetchTransfers = (limit = 30, sport?: SportKey, competition?: string) =>
  get<TransferRumour[]>(`/api/transfers?limit=${limit}${sport ? `&sport=${sport}` : ""}${competitionQuery(competition)}`);

// --- Competitions / Standings / Rankings ---

export interface Competition {
  slug: string;
  name: string;
  match_count: number;
}

export const fetchCompetitions = (sport: SportKey, lang: Lang = "en") =>
  get<Competition[]>(`/api/competitions?sport=${sport}&lang=${lang}`);

export interface StandingsRow {
  team_id: number;
  team_name: string;
  short_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

export const fetchStandings = (sport: "football" | "basketball", competition: string, lang: Lang = "en") =>
  get<StandingsRow[]>(`/api/standings?sport=${sport}&competition=${competition}&lang=${lang}`);

export interface RankingEntry {
  id: number;
  name: string;
  country: string;
  ranking: number | null;
}

export const fetchRankings = (tour: "atp" | "wta", lang: Lang = "en") =>
  get<RankingEntry[]>(`/api/rankings?tour=${tour}&lang=${lang}`);

// --- Player profiles ---

export interface FootballSeasonStats {
  goals: number;
  assists: number;
  rating: number;
}
export interface BasketballSeasonStats {
  ppg: number;
  rpg: number;
  apg: number;
}

export interface PlayerProfile {
  id: number;
  name: string;
  position: string;
  sport: "football" | "basketball";
  team: { id: number; name: string; short_name: string };
  season_stats: FootballSeasonStats | BasketballSeasonStats | null;
}

export const fetchPlayer = (id: string, lang: Lang = "en") => get<PlayerProfile>(`/api/players/${id}?lang=${lang}`);

export interface TennisPlayerProfile {
  id: number;
  name: string;
  country: string;
  tour: "atp" | "wta";
  ranking: number | null;
  win_pct: number | null;
  aces_per_match: number | null;
}

export const fetchTennisPlayer = (id: string, lang: Lang = "en") =>
  get<TennisPlayerProfile>(`/api/tennis/players/${id}?lang=${lang}`);
