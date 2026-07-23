/**
 * Seeds football, basketball, and tennis mock data — ported from the Django
 * backend's games/management/commands/seed_data.py so results are directly
 * comparable between the two stacks. Idempotent: wipes and recreates.
 * Usage: npm run seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic PRNG (mulberry32) — not the same algorithm as Python's
// Mersenne Twister, so outputs won't be byte-identical to Django's seed,
// but gives reproducible mock data across runs of this seed script.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const choice = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randint = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const randFloat = (min: number, max: number, decimals = 1) => {
  const v = min + rng() * (max - min);
  return Number(v.toFixed(decimals));
};

// Deterministic placeholder "monogram badge" (Slack/GitHub-avatar style) for
// every seeded Team — no real crest assets exist and hotlinking/hosting
// official trademarked club logos isn't appropriate for a public demo, so
// every team gets a generated SVG instead: a filled circle in the team's own
// primaryColor with bold white initials, inlined as a data: URI so no asset
// pipeline/hosting is needed. Initials come from `shortName` when it already
// reads as an abbreviation (true for every team in this file — RMA, MHA,
// etc.); otherwise falls back to initials of `name`'s significant words.
function teamBadgeSvg(name: string, shortName: string, color: string): string {
  const STOP_WORDS = new Set(['fc', 'cf', 'sc', 'the', 'of', 'and']);
  const isAbbreviation = /^[A-Za-z0-9]{2,5}$/.test(shortName);
  let initials: string;
  if (isAbbreviation) {
    initials = shortName.slice(0, 3).toUpperCase();
  } else {
    const words = name.split(/\s+/).filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
    initials = words.slice(0, 3).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 2).toUpperCase();
  }
  const fontSize = initials.length >= 3 ? 22 : 28;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<circle cx="32" cy="32" r="32" fill="${color}"/>` +
    `<text x="32" y="33" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="#FFFFFF">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Plausible season-stat chips for the player profile screen, varied by
// position so a keeper/defender doesn't get a striker's goal tally. Purely
// cosmetic mock data (no real-world source), same spirit as the rest of
// this seed script.
function footballSeasonStats(position: string) {
  if (position === 'GK') return { goals: 0, assists: randint(0, 1), rating: randFloat(6.4, 7.3) };
  if (position === 'DF') return { goals: randint(0, 3), assists: randint(0, 4), rating: randFloat(6.5, 7.6) };
  if (position === 'MF') return { goals: randint(1, 7), assists: randint(2, 9), rating: randFloat(6.7, 7.9) };
  return { goals: randint(6, 19), assists: randint(1, 7), rating: randFloat(6.9, 8.4) };
}
function basketballSeasonStats(position: string) {
  if (position === 'PG') return { ppg: randFloat(11, 23), rpg: randFloat(2.5, 5), apg: randFloat(5, 10.5) };
  if (position === 'SG') return { ppg: randFloat(13, 25), rpg: randFloat(2.5, 5), apg: randFloat(2, 5) };
  if (position === 'SF') return { ppg: randFloat(11, 21), rpg: randFloat(4, 7.5), apg: randFloat(2, 5) };
  if (position === 'PF') return { ppg: randFloat(9, 18), rpg: randFloat(6, 10.5), apg: randFloat(1, 3.5) };
  return { ppg: randFloat(8, 17), rpg: randFloat(8, 13.5), apg: randFloat(1, 3) };
}
function baseballSeasonStats(position: string) {
  if (position === 'P') return { avg: randFloat(0.05, 0.18), homeRuns: randint(0, 1), rbi: randint(0, 3) };
  if (position === 'C') return { avg: randFloat(0.235, 0.275), homeRuns: randint(8, 18), rbi: randint(40, 70) };
  if (position === 'IF') return { avg: randFloat(0.24, 0.29), homeRuns: randint(10, 25), rbi: randint(45, 85) };
  if (position === 'OF') return { avg: randFloat(0.25, 0.31), homeRuns: randint(15, 35), rbi: randint(55, 95) };
  return { avg: randFloat(0.24, 0.28), homeRuns: randint(10, 22), rbi: randint(40, 75) }; // DH
}
function volleyballSeasonStats(position: string) {
  if (position === 'S') return { kills: randFloat(0.5, 2.5), digs: randFloat(2, 4), blocks: randFloat(0.2, 0.6) };
  if (position === 'OH') return { kills: randFloat(3, 5.5), digs: randFloat(2, 4.5), blocks: randFloat(0.4, 0.9) };
  if (position === 'MB') return { kills: randFloat(2, 3.8), digs: randFloat(0.4, 1.2), blocks: randFloat(0.9, 1.6) };
  if (position === 'OPP') return { kills: randFloat(3.5, 6), digs: randFloat(1, 2.5), blocks: randFloat(0.5, 1) };
  return { kills: randFloat(0, 0.3), digs: randFloat(3.5, 6), blocks: randFloat(0, 0.1) }; // L (libero)
}

const FOOTBALL_TEAMS: [string, string, string, string][] = [
  ['Real Madrid', 'RMA', 'Spain', '#FEBE10'],
  ['FC Barcelona', 'BAR', 'Spain', '#A50044'],
  ['Manchester City', 'MCI', 'England', '#6CABDD'],
  ['Liverpool', 'LIV', 'England', '#C8102E'],
  ['Bayern Munich', 'BAY', 'Germany', '#DC052D'],
  ['Paris Saint-Germain', 'PSG', 'France', '#004170'],
];
const FOOTBALL_SQUAD_TEMPLATE = [
  ...Array(2).fill('GK'), ...Array(5).fill('DF'), ...Array(5).fill('MF'), ...Array(3).fill('FW'),
];
const FIRST_NAMES = [
  'Marco', 'Luka', 'Kylian', 'Erling', 'Jude', 'Pedri', 'Vini', 'Rodri', 'Thibaut', 'Alisson',
  'Virgil', 'Joshua', 'Leroy', 'Ousmane', 'Federico', 'Eduardo', 'Dani', 'Ferland', 'Aurelien', 'Toni', 'Harry', 'Phil',
];
const LAST_NAMES = [
  'Silva', 'Fernandez', 'Muller', 'Diaz', 'Martinez', 'Costa', 'Moreira', 'Vega', 'Kovac', 'Dubois',
  'Schmidt', 'Rossi', 'Almeida', 'Laurent', 'Weber', 'Navarro', 'Klein', 'Marchetti', 'Duarte', 'Fontaine',
];
// Fictional Israeli-flavored name pool for the Ligat Ha'Al squads (mixed
// with the generic pool above, not replacing it, to represent the
// foreign-legionnaire share every real Ligat Ha'Al squad carries).
const ISRAELI_FIRST_NAMES = [
  'Omri', 'Eitan', 'Yonatan', 'Idan', 'Liel', 'Tal', 'Nadav', 'Ben', 'Roy', 'Omer', 'Dor', 'Shon', 'Matan', 'Gil', 'Almog',
];
const ISRAELI_LAST_NAMES = [
  'Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Azulay', 'Dahan', 'Malka', 'Amar', 'Avraham', 'Hazan', 'Shani', 'Barda', 'Turgeman', 'Suissa',
];
const INJURY_REASONS: [string, string][] = [
  ['out', 'Hamstring tear'], ['out', 'Knee ligament injury'],
  ['doubtful', 'Ankle knock'], ['doubtful', 'Muscle fatigue'],
  ['suspended', 'Accumulated yellow cards'],
];
// home, away, competition, venue, hour, status
const FOOTBALL_FIXTURES: [string, string, string, string, number, string][] = [
  ['RMA', 'BAR', 'La Liga', 'Santiago Bernabeu', 21, 'scheduled'],
  ['MCI', 'LIV', 'Premier League', 'Etihad Stadium', 18, 'live'],
  ['BAY', 'PSG', 'Champions League', 'Allianz Arena', 20, 'scheduled'],
];

// Real Israeli Premier League (Ligat Ha'Al) clubs, real stadiums/colors —
// the first competition in this seed script with real, dedicated content
// rather than a handful of generic elite clubs. Squad players remain
// fictional throughout (same "mock data, no real-world source" spirit as the
// rest of this file). Coach names are a deliberate split, decided 2026-07-22:
// real, verified-current head coaches where a confident match was found
// (Maccabi Haifa, Hapoel Be'er Sheva, Hapoel Tel Aviv, Beitar Jerusalem,
// Hapoel Haifa — see LIGAT_HAAL_COACHES below), and clearly fictional names
// elsewhere rather than risk stating an unconfirmed or since-changed real
// person's job as fact.
const LIGAT_HAAL_TEAMS: [string, string, string, string][] = [
  ['Maccabi Haifa', 'MHA', 'Israel', '#0B6E4F'],
  ['Maccabi Tel Aviv', 'MTA', 'Israel', '#F7D117'],
  ["Hapoel Be'er Sheva", 'HBS', 'Israel', '#D71920'],
  ['Beitar Jerusalem', 'BJR', 'Israel', '#111111'],
  ['Hapoel Tel Aviv', 'HTA', 'Israel', '#C8102E'],
  ['Maccabi Petah Tikva', 'MPT', 'Israel', '#F58220'],
  ['Bnei Sakhnin', 'SAK', 'Israel', '#2E8B57'],
  ['Ashdod', 'ASH', 'Israel', '#0057A0'],
  ['Hapoel Haifa', 'HHA', 'Israel', '#C8102E'],
  ['Hapoel Jerusalem', 'HJR', 'Israel', '#C8102E'],
];
// Real stadium names — two pairs of clubs sharing a home ground
// (Sammy Ofer: Maccabi/Hapoel Haifa; Teddy: Beitar/Hapoel Jerusalem) is
// realistic, not a bug — `Game.venue` is a free string, not FK'd to `Team`.
const LIGAT_HAAL_VENUES: Record<string, string> = {
  MHA: 'Sammy Ofer Stadium',
  MTA: 'Bloomfield Stadium',
  HBS: 'Turner Stadium',
  BJR: 'Teddy Stadium',
  HTA: 'Bloomfield Stadium',
  MPT: 'HaMoshava Stadium',
  SAK: 'Doha Stadium',
  ASH: 'Yud-Alef Stadium',
  HHA: 'Sammy Ofer Stadium',
  HJR: 'Teddy Stadium',
};
const LIGAT_HAAL_COACHES: Record<string, string> = {
  MHA: 'Barak Bachar', // real, verified current head coach
  MTA: 'Guy Levy', // fictional
  HBS: 'Ran Kozuk', // real, verified current head coach
  BJR: 'Almog Cohen', // real, verified current head coach
  HTA: 'Elyaniv Barda', // real, verified current head coach
  MPT: 'Doron Asayag', // fictional
  SAK: 'Samer Halil', // fictional
  ASH: 'Yaniv Peretz', // fictional
  HHA: 'Haim Silvas', // real, verified current head coach
  HJR: 'Moti Ivri', // fictional
};
const LIGAT_HAAL_FIXTURES: [string, string, string, string, number, string][] = [
  ['MHA', 'MTA', "Ligat Ha'Al", LIGAT_HAAL_VENUES.MHA, 20, 'live'],
  ['HBS', 'BJR', "Ligat Ha'Al", LIGAT_HAAL_VENUES.HBS, 19, 'scheduled'],
];

const BASKETBALL_TEAMS: [string, string, string, string][] = [
  ['Los Angeles Lakers', 'LAL', 'USA', '#552583'],
  ['Boston Celtics', 'BOS', 'USA', '#007A33'],
  ['Golden State Warriors', 'GSW', 'USA', '#1D428A'],
  ['Miami Heat', 'MIA', 'USA', '#98002E'],
];
const BASKETBALL_SQUAD_TEMPLATE = [
  ...Array(2).fill('PG'), ...Array(2).fill('SG'), ...Array(2).fill('SF'), ...Array(2).fill('PF'), ...Array(2).fill('C'),
];
const BASKETBALL_FIXTURES: [string, string, string, string, number, string][] = [
  ['LAL', 'BOS', 'NBA', 'Crypto.com Arena', 19, 'scheduled'],
  ['GSW', 'MIA', 'NBA', 'Chase Center', 22, 'live'],
];

const BASEBALL_TEAMS: [string, string, string, string][] = [
  ['New York Yankees', 'NYY', 'USA', '#0C2340'],
  ['Los Angeles Dodgers', 'LAD', 'USA', '#005A9C'],
  ['Boston Red Sox', 'BOS', 'USA', '#BD3039'],
  ['Houston Astros', 'HOU', 'USA', '#EB6E1F'],
];
const BASEBALL_SQUAD_TEMPLATE = [
  ...Array(4).fill('P'), ...Array(2).fill('C'), ...Array(4).fill('IF'), ...Array(2).fill('OF'), ...Array(1).fill('DH'),
];
const BASEBALL_FIXTURES: [string, string, string, string, number, string][] = [
  ['NYY', 'BOS', 'MLB', 'Yankee Stadium', 19, 'scheduled'],
  ['LAD', 'HOU', 'MLB', 'Dodger Stadium', 22, 'live'],
];

const VOLLEYBALL_TEAMS: [string, string, string, string][] = [
  ['Italy', 'ITA', 'Italy', '#008C45'],
  ['Poland', 'POL', 'Poland', '#DC143C'],
  ['Brazil', 'BRA', 'Brazil', '#FFDF00'],
  ['USA', 'USA', 'USA', '#B31942'],
];
const VOLLEYBALL_SQUAD_TEMPLATE = [
  ...Array(2).fill('S'), ...Array(4).fill('OH'), ...Array(3).fill('MB'), ...Array(2).fill('OPP'), ...Array(1).fill('L'),
];
const VOLLEYBALL_FIXTURES: [string, string, string, string, number, string][] = [
  ['ITA', 'POL', 'FIVB Nations League', 'Unipol Arena', 18, 'scheduled'],
  ['BRA', 'USA', 'FIVB Nations League', 'Ginasio do Ibirapuera', 20, 'live'],
];

const TENNIS_PLAYERS: [string, string, 'atp' | 'wta', number][] = [
  ['Novak Djokovic', 'Serbia', 'atp', 1],
  ['Carlos Alcaraz', 'Spain', 'atp', 2],
  ['Jannik Sinner', 'Italy', 'atp', 3],
  ['Daniil Medvedev', 'Russia', 'atp', 4],
  ['Iga Swiatek', 'Poland', 'wta', 1],
  ['Aryna Sabalenka', 'Belarus', 'wta', 2],
  ['Coco Gauff', 'USA', 'wta', 3],
  ['Elena Rybakina', 'Kazakhstan', 'wta', 4],
];
const TENNIS_MATCHES: [string, string, 'atp' | 'wta', string, string, string, number][] = [
  ['Novak Djokovic', 'Carlos Alcaraz', 'atp', 'Wimbledon', 'SF', 'Centre Court', 14],
  ['Iga Swiatek', 'Aryna Sabalenka', 'wta', 'Wimbledon', 'SF', 'Centre Court', 17],
];

const TRANSLATIONS_HE: [string, string, string][] = [
  ['Real Madrid', 'ריאל מדריד', 'team'],
  ['FC Barcelona', 'פ.צ. ברצלונה', 'team'],
  ['Manchester City', "מנצ'סטר סיטי", 'team'],
  ['Liverpool', 'ליברפול', 'team'],
  ['Bayern Munich', 'באיירן מינכן', 'team'],
  ['Paris Saint-Germain', "פריז סן ז'רמן", 'team'],
  ['Los Angeles Lakers', "לוס אנג'לס לייקרס", 'team'],
  ['Boston Celtics', 'בוסטון סלטיקס', 'team'],
  ['Golden State Warriors', 'גולדן סטייט ווריורס', 'team'],
  ['Miami Heat', 'מיאמי היט', 'team'],
  ['New York Yankees', "ניו יורק יאנקיז", 'team'],
  ['Los Angeles Dodgers', "לוס אנג'לס דודג'רס", 'team'],
  ['Boston Red Sox', 'בוסטון רד סוקס', 'team'],
  ['Houston Astros', 'יוסטון אסטרוס', 'team'],
  ['Italy', 'איטליה', 'team'],
  ['Poland', 'פולין', 'team'],
  ['Brazil', 'ברזיל', 'team'],
  ['USA', 'ארה"ב', 'team'],
  ['Novak Djokovic', "נובאק ג'וקוביץ'", 'player'],
  ['Carlos Alcaraz', 'קרלוס אלקראס', 'player'],
  ['Jannik Sinner', 'יאניק סינר', 'player'],
  ['Daniil Medvedev', 'דניל מדבדב', 'player'],
  ['Iga Swiatek', 'איגה שיונטק', 'player'],
  ['Aryna Sabalenka', 'אריינה סבלנקה', 'player'],
  ['Coco Gauff', 'קוקו גאף', 'player'],
  ['Elena Rybakina', 'אלנה ריבקינה', 'player'],
  ['La Liga', 'ליגה ספרדית', 'competition'],
  ['Premier League', 'הפרמייר ליג', 'competition'],
  ['Champions League', 'ליגת האלופות', 'competition'],
  ['Friendly', 'משחק ידידות', 'competition'],
  ['League', 'ליגה', 'competition'],
  ['Cup', 'גביע', 'competition'],
  ['Wimbledon', 'וימבלדון', 'competition'],
  ['MLB', 'MLB', 'competition'],
  ['FIVB Nations League', 'ליגת האומות FIVB', 'competition'],
  ['Santiago Bernabeu', 'סנטיאגו ברנבאו', 'venue'],
  ['Etihad Stadium', 'אצטדיון האיתיחאד', 'venue'],
  ['Allianz Arena', 'אצטדיון אליאנץ', 'venue'],
  ['Crypto.com Arena', 'אצטדיון קריפטו.קום', 'venue'],
  ['Chase Center', "צ'ייס סנטר", 'venue'],
  ['Centre Court', 'המגרש המרכזי', 'venue'],
  ['Yankee Stadium', 'אצטדיון יאנקי', 'venue'],
  ['Dodger Stadium', "אצטדיון דודג'רס", 'venue'],
  ['Unipol Arena', 'אצטדיון יוניפול', 'venue'],
  ['Ginasio do Ibirapuera', 'גינסיו דו איבירפוארה', 'venue'],
  ['Maccabi Haifa', 'מכבי חיפה', 'team'],
  ['Maccabi Tel Aviv', 'מכבי תל אביב', 'team'],
  ["Hapoel Be'er Sheva", 'הפועל באר שבע', 'team'],
  ['Beitar Jerusalem', 'בית"ר ירושלים', 'team'],
  ['Hapoel Tel Aviv', 'הפועל תל אביב', 'team'],
  ['Maccabi Petah Tikva', 'מכבי פתח תקווה', 'team'],
  ['Bnei Sakhnin', 'בני סכנין', 'team'],
  ['Ashdod', 'אשדוד', 'team'],
  ['Hapoel Haifa', 'הפועל חיפה', 'team'],
  ['Hapoel Jerusalem', 'הפועל ירושלים', 'team'],
  ["Ligat Ha'Al", 'ליגת העל', 'competition'],
  ['Sammy Ofer Stadium', 'אצטדיון סמי עופר', 'venue'],
  ['Bloomfield Stadium', 'אצטדיון בלומפילד', 'venue'],
  ['Turner Stadium', 'אצטדיון טרנר', 'venue'],
  ['Teddy Stadium', 'אצטדיון טדי', 'venue'],
  ['HaMoshava Stadium', 'אצטדיון המושבה', 'venue'],
  ['Doha Stadium', 'אצטדיון דוחא', 'venue'],
  ['Yud-Alef Stadium', 'אצטדיון י"א', 'venue'],
  ['Barak Bachar', 'ברק בכר', 'coach'],
  ['Guy Levy', 'גיא לוי', 'coach'],
  ['Ran Kozuk', "רן קוז'וק", 'coach'],
  ['Almog Cohen', 'אלמוג כהן', 'coach'],
  ['Elyaniv Barda', 'אליניב ברדה', 'coach'],
  ['Doron Asayag', 'דורון עסייג', 'coach'],
  ['Samer Halil', 'סאמר חליל', 'coach'],
  ['Yaniv Peretz', 'יניב פרץ', 'coach'],
  ['Haim Silvas', 'חיים סילבס', 'coach'],
  ['Moti Ivri', 'מוטי עברי', 'coach'],
];

function todayAt(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function wipe() {
  await prisma.matchAnalysis.deleteMany();
  await prisma.tennisSet.deleteMany();
  await prisma.tennisMatch.deleteMany();
  await prisma.tennisPlayer.deleteMany();
  await prisma.matchEvent.deleteMany();
  await prisma.lineup.deleteMany();
  await prisma.quarterScore.deleteMany();
  await prisma.inningScore.deleteMany();
  await prisma.setScore.deleteMany();
  await prisma.game.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.injury.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.nameTranslation.deleteMany();
}

type TeamSport = 'football' | 'basketball' | 'baseball' | 'volleyball';

function seasonStatsFor(sport: TeamSport, position: string) {
  if (sport === 'football') return footballSeasonStats(position);
  if (sport === 'basketball') return basketballSeasonStats(position);
  if (sport === 'baseball') return baseballSeasonStats(position);
  return volleyballSeasonStats(position);
}

async function createSquad(teamId: number, template: string[], sport: TeamSport, israeliMix = false) {
  const used = new Set<string>();
  const players = [];
  for (let i = 0; i < template.length; i++) {
    let name: string;
    do {
      name =
        israeliMix && rng() < 0.7
          ? `${choice(ISRAELI_FIRST_NAMES)} ${choice(ISRAELI_LAST_NAMES)}`
          : `${choice(FIRST_NAMES)} ${choice(LAST_NAMES)}`;
    } while (used.has(name));
    used.add(name);
    const seasonStats = seasonStatsFor(sport, template[i]);
    players.push(
      await prisma.player.create({
        data: { teamId, name, position: template[i], shirtNumber: i + 1, seasonStats },
      }),
    );
  }
  return players;
}

// Single-league competition label used for every H2H/general-form result in
// sports that don't vary competitions the way football does (basketball's
// 'NBA', baseball's 'MLB', volleyball's 'FIVB Nations League').
function singleLeagueLabel(sport: TeamSport): string {
  if (sport === 'basketball') return 'NBA';
  if (sport === 'baseball') return 'MLB';
  return 'FIVB Nations League';
}

// First-N-available starters, in squad-template order — same simplification
// basketball already uses (no real positional-balance logic), just with a
// per-sport starter count (basketball 5, baseball 9, volleyball 6).
function startersCountFor(sport: TeamSport): number {
  if (sport === 'basketball') return 5;
  if (sport === 'baseball') return 9;
  return 6; // volleyball
}

async function seedTeamSport(
  sport: TeamSport,
  teamDefs: [string, string, string, string][],
  squadTemplate: string[],
  fixtures: [string, string, string, string, number, string][],
  scoreRange: [number, number],
  opts?: { israeliNameMix?: boolean; coachNames?: Record<string, string>; competitionId?: number },
) {
  const teams: Record<string, { id: number; shortName: string }> = {};
  for (const [name, short, country, color] of teamDefs) {
    const team = await prisma.team.create({
      data: {
        sport,
        name,
        shortName: short,
        country,
        primaryColor: color,
        coachName: opts?.coachNames?.[short],
        logoUrl: teamBadgeSvg(name, short, color),
      },
    });
    teams[short] = team;
  }

  const players: Record<string, any[]> = {};
  for (const [, short] of teamDefs) {
    players[short] = await createSquad(teams[short].id, squadTemplate, sport, opts?.israeliNameMix);
  }

  const shorts = Object.keys(teams);
  const today = new Date();

  // H2H history for today's fixture pairs
  for (const [home, away] of fixtures) {
    for (const weeksAgo of [3, 9]) {
      const h2hHome = choice([home, away]);
      const h2hAway = h2hHome === home ? away : home;
      const date = new Date(today);
      date.setDate(date.getDate() - weeksAgo * 7);
      await prisma.matchResult.create({
        data: {
          date,
          competition: sport === 'football' ? 'Friendly' : singleLeagueLabel(sport),
          homeTeamId: teams[h2hHome].id,
          awayTeamId: teams[h2hAway].id,
          homeScore: randint(...scoreRange),
          awayScore: randint(...scoreRange),
        },
      });
    }
  }

  // General recent form: 5 per team
  for (const short of shorts) {
    for (let i = 0; i < 5; i++) {
      const opponent = choice(shorts.filter((s) => s !== short));
      const isHome = rng() < 0.5;
      const date = new Date(today);
      date.setDate(date.getDate() - (7 * (i + 1) + randint(0, 3)));
      await prisma.matchResult.create({
        data: {
          date,
          competition: sport === 'football' ? choice(['League', 'Cup', 'Champions League']) : singleLeagueLabel(sport),
          homeTeamId: teams[isHome ? short : opponent].id,
          awayTeamId: teams[isHome ? opponent : short].id,
          homeScore: randint(...scoreRange),
          awayScore: randint(...scoreRange),
        },
      });
    }
  }

  // Injuries
  for (const short of shorts) {
    const count = sport === 'football' ? randint(2, 3) : randint(1, 2);
    const pool = [...players[short]];
    for (let i = 0; i < count; i++) {
      const idx = randint(0, pool.length - 1);
      const [status, reason] = choice(INJURY_REASONS);
      await prisma.injury.create({ data: { playerId: pool[idx].id, teamId: teams[short].id, status: status as any, reason } });
      pool.splice(idx, 1);
    }
  }

  // Today's fixtures + lineups
  for (const [home, away, competition, venue, hour, status] of fixtures) {
    const isLive = status === 'live';
    // Match-detail Overview tab stat rows — only populated for live/finished
    // games (matches the design brief's own mock data, which leaves
    // upcoming fixtures at all-zero/absent rather than faking pre-match
    // numbers).
    const footballStats =
      sport === 'football' && isLive
        ? (() => {
            const homePoss = randint(42, 62);
            return {
              home: { possession: homePoss, shots: randint(8, 16), shotsOnTarget: randint(3, 8), corners: randint(2, 8) },
              away: { possession: 100 - homePoss, shots: randint(6, 14), shotsOnTarget: randint(2, 6), corners: randint(1, 6) },
            };
          })()
        : null;
    const game = await prisma.game.create({
      data: {
        sport,
        competition,
        competitionId: opts?.competitionId,
        kickoff: todayAt(hour),
        venue,
        status: status as any,
        homeTeamId: teams[home].id,
        awayTeamId: teams[away].id,
        minute: sport === 'football' && isLive ? 60 : null,
        homeScore: isLive ? (sport === 'football' ? 1 : null) : null,
        awayScore: isLive ? (sport === 'football' ? 1 : null) : null,
        stats: footballStats ?? undefined,
      },
    });

    for (const short of [home, away]) {
      const outIds = new Set(
        (await prisma.injury.findMany({ where: { teamId: teams[short].id, status: 'out' } })).map((i) => i.playerId),
      );
      const available = players[short].filter((p) => !outIds.has(p.id));
      if (sport === 'football') {
        const gk = available.find((p) => p.position === 'GK');
        const outfield = available.filter((p) => p.position !== 'GK').slice(0, 10);
        for (const p of [gk, ...outfield]) {
          await prisma.lineup.create({ data: { gameId: game.id, teamId: teams[short].id, playerId: p.id, isStarting: true, position: p.position } });
        }
        const bench = available.filter((p) => p !== gk && !outfield.includes(p)).slice(0, 5);
        for (const p of bench) {
          await prisma.lineup.create({ data: { gameId: game.id, teamId: teams[short].id, playerId: p.id, isStarting: false, position: p.position } });
        }
      } else {
        const startersCount = startersCountFor(sport);
        const starters = available.slice(0, startersCount);
        const bench = available.slice(startersCount);
        for (const p of starters) {
          await prisma.lineup.create({ data: { gameId: game.id, teamId: teams[short].id, playerId: p.id, isStarting: true, position: p.position } });
        }
        for (const p of bench) {
          await prisma.lineup.create({ data: { gameId: game.id, teamId: teams[short].id, playerId: p.id, isStarting: false, position: p.position } });
        }
      }
    }

    if (sport === 'basketball' && isLive) {
      let homeTotal = 0;
      let awayTotal = 0;
      for (let q = 1; q <= 3; q++) {
        const h = randint(20, 32);
        const a = randint(20, 32);
        homeTotal += h;
        awayTotal += a;
        await prisma.quarterScore.create({ data: { gameId: game.id, quarter: q, homeScore: h, awayScore: a } });
      }
      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: homeTotal,
          awayScore: awayTotal,
          stats: {
            home: { points: homeTotal, rebounds: randint(32, 48), assists: randint(16, 28), fgPct: randint(42, 52) },
            away: { points: awayTotal, rebounds: randint(30, 46), assists: randint(14, 26), fgPct: randint(40, 50) },
          },
        },
      });
    }

    if (sport === 'baseball' && isLive) {
      // A game in progress through inning 3-6 (not a full 9) — same "live,
      // not yet finished" framing basketball's 3-of-4-quarters seed uses.
      let homeTotal = 0;
      let awayTotal = 0;
      const inningsSoFar = randint(3, 6);
      for (let inning = 1; inning <= inningsSoFar; inning++) {
        const h = randint(0, 3);
        const a = randint(0, 3);
        homeTotal += h;
        awayTotal += a;
        await prisma.inningScore.create({ data: { gameId: game.id, inning, homeScore: h, awayScore: a } });
      }
      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: homeTotal,
          awayScore: awayTotal,
          stats: {
            home: { hits: randint(homeTotal, homeTotal + 8), runs: homeTotal, errors: randint(0, 2), walks: randint(0, 5) },
            away: { hits: randint(awayTotal, awayTotal + 8), runs: awayTotal, errors: randint(0, 2), walks: randint(0, 5) },
          },
        },
      });
    }

    if (sport === 'volleyball' && isLive) {
      // 1-2 completed sets plus one in-progress set — mirrors seedTennis()'s
      // live-match pattern (a set-based sport, closer to tennis than to
      // basketball's fixed-period structure).
      const completedSets = randint(1, 2);
      let homeSetsWon = 0;
      let awaySetsWon = 0;
      for (let setNumber = 1; setNumber <= completedSets; setNumber++) {
        const homeWinsSet = rng() < 0.5;
        const winnerScore = 25;
        const loserScore = randint(15, 23);
        const h = homeWinsSet ? winnerScore : loserScore;
        const a = homeWinsSet ? loserScore : winnerScore;
        if (homeWinsSet) homeSetsWon++; else awaySetsWon++;
        await prisma.setScore.create({ data: { gameId: game.id, setNumber, homeScore: h, awayScore: a } });
      }
      const inProgressH = randint(8, 20);
      const inProgressA = randint(8, 20);
      await prisma.setScore.create({
        data: { gameId: game.id, setNumber: completedSets + 1, homeScore: inProgressH, awayScore: inProgressA },
      });
      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: homeSetsWon,
          awayScore: awaySetsWon,
          stats: {
            home: { kills: randint(30, 55), digs: randint(25, 45), blocks: randint(4, 12), aces: randint(2, 9) },
            away: { kills: randint(28, 52), digs: randint(24, 42), blocks: randint(3, 11), aces: randint(2, 8) },
          },
        },
      });
    }
  }

  return { teams, players };
}

// Generates goal/card MatchEvent rows for one finished game, consistent with
// its final score (goal-type events exactly match homeScore/awayScore) —
// so the timeline, standings, and top-scorers are all populated from one
// generation pass rather than drifting out of sync with each other.
async function createMatchEvents(
  gameId: number,
  homeTeamId: number,
  awayTeamId: number,
  homePlayers: any[],
  awayPlayers: any[],
  homeScore: number,
  awayScore: number,
) {
  const outfield = (list: any[]) => list.filter((p) => p.position !== 'GK');

  const addGoals = async (teamId: number, pool: any[], count: number) => {
    for (let i = 0; i < count; i++) {
      const scorer = choice(pool);
      const isPenalty = rng() < 0.12;
      const hasAssist = !isPenalty && rng() < 0.35;
      const assistCandidates = pool.filter((p) => p.id !== scorer.id);
      const relatedPlayerId = hasAssist && assistCandidates.length ? choice(assistCandidates).id : undefined;
      await prisma.matchEvent.create({
        data: {
          gameId,
          minute: randint(1, 90),
          type: isPenalty ? 'penalty_goal' : 'goal',
          teamId,
          playerId: scorer.id,
          relatedPlayerId,
        },
      });
    }
  };

  await addGoals(homeTeamId, outfield(homePlayers), homeScore);
  await addGoals(awayTeamId, outfield(awayPlayers), awayScore);

  const withTeam = [
    ...homePlayers.map((p) => ({ p, teamId: homeTeamId })),
    ...awayPlayers.map((p) => ({ p, teamId: awayTeamId })),
  ];
  const cardCount = randint(2, 5);
  for (let i = 0; i < cardCount; i++) {
    const { p, teamId } = choice(withTeam);
    await prisma.matchEvent.create({
      data: {
        gameId,
        minute: randint(1, 90),
        type: rng() < 0.1 ? 'red_card' : 'yellow_card',
        teamId,
        playerId: p.id,
      },
    });
  }
}

// A single round-robin season (each of the 10 clubs plays every other once
// = 45 finished games) dated across the past ~9 weeks, so standings/top-
// scorers/match-timelines all have real, internally-consistent content —
// unlike every other seeded competition, which has zero finished games
// (standings.service.ts only counts `status: finished` rows).
async function seedLigatHaalSeason(
  teams: Record<string, { id: number; shortName: string }>,
  players: Record<string, any[]>,
  competitionId: number,
) {
  const shorts = Object.keys(teams);
  const matchups: [string, string][] = [];
  for (let i = 0; i < shorts.length; i++) {
    for (let j = i + 1; j < shorts.length; j++) {
      matchups.push((i + j) % 2 === 0 ? [shorts[i], shorts[j]] : [shorts[j], shorts[i]]);
    }
  }

  const today = new Date();
  for (let idx = 0; idx < matchups.length; idx++) {
    const [home, away] = matchups[idx];
    // ~5 games per "round", most recent round closest to today.
    const daysAgo = 63 - Math.floor(idx / 5) * 7 - (idx % 5);
    const kickoff = new Date(today);
    kickoff.setDate(kickoff.getDate() - daysAgo);
    kickoff.setHours(19, 0, 0, 0);

    const homeScore = randint(0, 4);
    const awayScore = randint(0, 4);

    const game = await prisma.game.create({
      data: {
        sport: 'football',
        competition: "Ligat Ha'Al",
        competitionId,
        kickoff,
        venue: LIGAT_HAAL_VENUES[home],
        status: 'finished',
        homeTeamId: teams[home].id,
        awayTeamId: teams[away].id,
        homeScore,
        awayScore,
      },
    });

    await createMatchEvents(game.id, teams[home].id, teams[away].id, players[home], players[away], homeScore, awayScore);
  }
}

async function seedTennis() {
  const players: Record<string, { id: number; tour: 'atp' | 'wta' }> = {};
  for (const [name, country, tour, ranking] of TENNIS_PLAYERS) {
    // Higher-ranked players get a plausibly better win% (mock data, no real
    // source), same spirit as footballSeasonStats/basketballSeasonStats.
    const winPct = randFloat(Math.max(50, 90 - ranking * 5), Math.max(65, 96 - ranking * 4));
    const acesPerMatch = randFloat(3, 15);
    players[name] = await prisma.tennisPlayer.create({ data: { name, country, tour, ranking, winPct, acesPerMatch } });
  }
  const names = Object.keys(players);

  async function createFinishedMatch(p1Name: string, p2Name: string, daysAgo: number, tournament: string, round: string) {
    const p1 = players[p1Name];
    const p2 = players[p2Name];
    const winner = choice([p1, p2]);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(14, 0, 0, 0);
    const match = await prisma.tennisMatch.create({
      data: {
        tour: p1.tour,
        tournament,
        round,
        venue: `${tournament} Court`,
        startTime: date,
        status: 'finished',
        player1Id: p1.id,
        player2Id: p2.id,
        winnerId: winner.id,
      },
    });
    const numSets = choice([2, 3]);
    for (let setNumber = 1; setNumber <= numSets; setNumber++) {
      const isLast = setNumber === numSets;
      const winnerGames = 6;
      const loserGames = isLast ? randint(0, 4) : randint(2, 4);
      const [p1Games, p2Games] = winner === p1 ? [winnerGames, loserGames] : [loserGames, winnerGames];
      await prisma.tennisSet.create({ data: { matchId: match.id, setNumber, player1Games: p1Games, player2Games: p2Games } });
    }
    return match;
  }

  // H2H for today's matchups
  for (const [p1Name, p2Name] of TENNIS_MATCHES) {
    for (const daysAgo of [60, 200]) {
      await createFinishedMatch(p1Name, p2Name, daysAgo, players[p1Name].tour === 'atp' ? 'ATP Masters' : 'WTA 1000', 'F');
    }
  }
  // General recent form
  for (const name of names) {
    for (let i = 0; i < 4; i++) {
      const opponent = choice(names.filter((n) => n !== name && players[n].tour === players[name].tour));
      await createFinishedMatch(name, opponent, 14 * (i + 1) + randint(0, 5), 'Tour Event', choice(['R32', 'R16', 'QF']));
    }
  }

  // Today's matches — first one live
  for (let i = 0; i < TENNIS_MATCHES.length; i++) {
    const [p1Name, p2Name, tour, tournament, round, venue, hour] = TENNIS_MATCHES[i];
    const isLive = i === 0;
    const match = await prisma.tennisMatch.create({
      data: {
        tour, tournament, round, venue,
        startTime: todayAt(hour),
        status: isLive ? 'live' : 'scheduled',
        player1Id: players[p1Name].id,
        player2Id: players[p2Name].id,
        stats: isLive
          ? {
              home: { aces: randint(4, 13), winners: randint(15, 32), unforcedErrors: randint(8, 20), doubleFaults: randint(0, 4) },
              away: { aces: randint(3, 12), winners: randint(14, 30), unforcedErrors: randint(9, 22), doubleFaults: randint(0, 4) },
            }
          : undefined,
      },
    });
    if (isLive) {
      await prisma.tennisSet.create({ data: { matchId: match.id, setNumber: 1, player1Games: 4, player2Games: 3 } });
    }
  }
}

async function seedTranslations() {
  for (const [sourceText, translatedText, category] of TRANSLATIONS_HE) {
    await prisma.nameTranslation.upsert({
      where: { sourceText },
      update: { translatedText, category },
      create: { sourceText, translatedText, category },
    });
  }
}

async function main() {
  await wipe();
  await seedTeamSport('football', FOOTBALL_TEAMS, FOOTBALL_SQUAD_TEMPLATE, FOOTBALL_FIXTURES, [0, 4]);

  const ligatHaal = await prisma.competition.findUnique({
    where: { sportKey_slug: { sportKey: 'football', slug: 'ligat-haal' } },
  });
  if (!ligatHaal) {
    console.warn(
      "Ligat Ha'Al Competition row not found — run `npm run seed:competitions` before `npm run seed`. Skipping Ligat Ha'Al seed data.",
    );
  } else {
    const { teams: ligatTeams, players: ligatPlayers } = await seedTeamSport(
      'football',
      LIGAT_HAAL_TEAMS,
      FOOTBALL_SQUAD_TEMPLATE,
      LIGAT_HAAL_FIXTURES,
      [0, 4],
      { israeliNameMix: true, coachNames: LIGAT_HAAL_COACHES, competitionId: ligatHaal.id },
    );
    await seedLigatHaalSeason(ligatTeams, ligatPlayers, ligatHaal.id);
  }

  await seedTeamSport('basketball', BASKETBALL_TEAMS, BASKETBALL_SQUAD_TEMPLATE, BASKETBALL_FIXTURES, [95, 125]);
  await seedTeamSport('baseball', BASEBALL_TEAMS, BASEBALL_SQUAD_TEMPLATE, BASEBALL_FIXTURES, [1, 9]);
  await seedTeamSport('volleyball', VOLLEYBALL_TEAMS, VOLLEYBALL_SQUAD_TEMPLATE, VOLLEYBALL_FIXTURES, [60, 100]);
  await seedTennis();
  await seedTranslations();

  const [teams, players, games, translations, matchEvents] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
    prisma.game.count(),
    prisma.nameTranslation.count(),
    prisma.matchEvent.count(),
  ]);
  console.log(
    `Seeded ${teams} teams, ${players} players, ${games} games, ${matchEvents} match events, ${translations} Hebrew translations.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
