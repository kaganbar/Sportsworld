export type SportKind = 'football' | 'basketball' | 'tennis';
export type NormalizedStatus = 'scheduled' | 'live' | 'finished';

export interface NormalizedQuarter {
  quarter: number;
  homeScore: number;
  awayScore: number;
}

export interface NormalizedSet {
  setNumber: number;
  player1Games: number;
  player2Games: number;
}

// One row per fixture, already resolved to real names (English as the
// stable "source" text, Hebrew as the pre-translated counterpart where the
// source provides one) and mapped onto our sport-agnostic vocabulary. This
// is the boundary between "whatever a given provider's API looks like" and
// everything downstream (normalize/upsert, WS broadcast) — a new source
// only ever has to produce this shape, never touch the rest of the pipeline.
export interface NormalizedEvent {
  sourceId: string; // provider-qualified fixture id, used for idempotent re-fetches
  sport: SportKind;
  competition: string;
  competitionHe?: string;
  round?: string; // tennis only
  kickoff: Date;
  status: NormalizedStatus;

  homeName: string;
  homeNameHe?: string;
  homeShortName?: string;
  homeColor?: string;
  homeCountry?: string;
  homeRanking?: number | null; // tennis only
  homeLogoUrl?: string; // team-sport only; real crest URL where a source provides one

  awayName: string;
  awayNameHe?: string;
  awayShortName?: string;
  awayColor?: string;
  awayCountry?: string;
  awayRanking?: number | null; // tennis only
  awayLogoUrl?: string; // team-sport only; real crest URL where a source provides one

  homeScore: number | null;
  awayScore: number | null;
  minute?: number | null; // football only
  quarters?: NormalizedQuarter[]; // basketball only
  sets?: NormalizedSet[]; // tennis only
  tour?: 'atp' | 'wta'; // tennis only
}

export interface Parser {
  readonly sourceId: string;
  readonly sport: SportKind;
  fetch(): Promise<unknown>;
  parse(raw: unknown): NormalizedEvent[];
}
