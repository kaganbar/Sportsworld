import axios from 'axios';

// Confirmed by loading https://www.365scores.com/he in a real browser and
// capturing its network calls: the page is a client-rendered React/MobX app
// with no server-rendered fixture data, but it calls this endpoint directly
// with no auth/session required — a plain GET with a browser UA + Referer
// returns the same JSON the site itself renders from. langId=1 returns
// English names, langId=2 Hebrew, for the identical fixture ids — fetching
// both gives us a ready-made (English source, Hebrew translation) pair with
// no separate translation step.
const BASE_URL = 'https://webws.365scores.com/web/games/allscores/';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Referer: 'https://www.365scores.com/',
};

export interface RawCompetitor {
  id: number;
  name: string;
  shortName?: string;
  symbolicName?: string;
  score: number;
  color?: string;
  countryId?: number;
  rankings?: { name: string; position: number }[];
}

export interface RawStage {
  id: number;
  name: string;
  shortName: string;
  homeCompetitorScore: number;
  awayCompetitorScore: number;
  isLive?: boolean;
  isEnded?: boolean;
}

export interface RawGame {
  id: number;
  sportId: number;
  competitionDisplayName: string;
  stageName?: string;
  roundName?: string;
  startTime: string;
  statusGroup: number; // 2 = scheduled, 3 = live, 4 = finished
  gameTime: number; // football: elapsed minutes while live
  homeCompetitor: RawCompetitor;
  awayCompetitor: RawCompetitor;
  stages?: RawStage[];
}

export interface RawCountry {
  id: number;
  name: string;
}

export interface RawAllScoresResponse {
  games: RawGame[];
  countries: RawCountry[];
}

export interface AllScoresBilingual {
  en: RawAllScoresResponse;
  he: RawAllScoresResponse;
}

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export async function fetchAllScores(sportId: number, date: Date): Promise<AllScoresBilingual> {
  const dateStr = formatDate(date);
  const paramsFor = (langId: number) => ({
    appTypeId: 5,
    langId,
    timezoneName: 'Asia/Jerusalem',
    userCountryId: 6,
    sports: sportId,
    startDate: dateStr,
    endDate: dateStr,
    showOdds: false,
    // Same flag 365scores' own frontend sends on its dashboard view — without
    // it "today" includes every lower-division/youth/friendly fixture
    // worldwide (70+ for football alone), which floods a "today's games" list.
    onlyMajorGames: true,
  });

  const [en, he] = await Promise.all([
    axios.get<RawAllScoresResponse>(BASE_URL, { params: paramsFor(1), headers: HEADERS, timeout: 15000 }),
    axios.get<RawAllScoresResponse>(BASE_URL, { params: paramsFor(2), headers: HEADERS, timeout: 15000 }),
  ]);

  return { en: en.data, he: he.data };
}

export function statusFromGroup(statusGroup: number): 'scheduled' | 'live' | 'finished' {
  if (statusGroup === 3) return 'live';
  if (statusGroup === 4) return 'finished';
  return 'scheduled';
}

export function scoreOrNull(score: number | undefined): number | null {
  return score !== undefined && score >= 0 ? Math.round(score) : null;
}
