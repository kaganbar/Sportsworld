/**
 * Seeds the canonical Competition list per sport (Premier League, NBA, ATP
 * Tour, ...) plus one reserved "other" bucket per sport for anything the
 * scraper produces that no alias matches — additive and idempotent (upsert
 * on [sportKey, slug]), safe to re-run against a live DB with real scraped
 * data already in it. Does NOT touch Game/Team/etc — see
 * backfill-competitions.ts for resolving existing rows against this list.
 * Usage: npm run seed:competitions
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Seed {
  slug: string;
  name: string;
  nameHe: string;
  tier: number;
  aliases: string[];
}

const FOOTBALL: Seed[] = [
  { slug: 'world-cup', name: 'FIFA World Cup', nameHe: 'מונדיאל', tier: 1, aliases: ['FIFA World Cup', 'World Cup'] },
  { slug: 'champions-league', name: 'UEFA Champions League', nameHe: 'ליגת האלופות', tier: 2, aliases: ['UEFA Champions League', 'Champions League'] },
  { slug: 'europa-league', name: 'UEFA Europa League', nameHe: 'ליגת האירופה', tier: 3, aliases: ['UEFA Europa League', 'Europa League'] },
  { slug: 'conference-league', name: 'UEFA Conference League', nameHe: 'ליגת הכנפרנס', tier: 4, aliases: ['UEFA Europa Conference League', 'UEFA Conference League', 'Conference League'] },
  { slug: 'premier-league', name: 'Premier League', nameHe: 'הפרמייר ליג', tier: 5, aliases: ['Premier League', 'English Premier League', 'EPL'] },
  { slug: 'la-liga', name: 'La Liga', nameHe: 'לה ליגה', tier: 6, aliases: ['La Liga', 'LaLiga', 'Primera Division', 'Primera División'] },
  { slug: 'serie-a', name: 'Serie A', nameHe: 'סרייה א', tier: 7, aliases: ['Serie A'] },
  { slug: 'bundesliga', name: 'Bundesliga', nameHe: 'הבונדסליגה', tier: 8, aliases: ['Bundesliga'] },
  { slug: 'ligue-1', name: 'Ligue 1', nameHe: 'ליגה 1 הצרפתית', tier: 9, aliases: ['Ligue 1'] },
  { slug: 'mls', name: 'MLS', nameHe: 'MLS', tier: 10, aliases: ['MLS', 'Major League Soccer'] },
  { slug: 'saudi-pro-league', name: 'Saudi Pro League', nameHe: 'הליגה הסעודית', tier: 11, aliases: ['Saudi Pro League', 'Saudi Professional League', 'Roshn Saudi League'] },
  { slug: 'copa-libertadores', name: 'Copa Libertadores', nameHe: 'קופה ליברטדורס', tier: 12, aliases: ['Copa Libertadores', 'CONMEBOL Libertadores'] },
  { slug: 'national-cups', name: 'National Cups', nameHe: 'גביעים מקומיים', tier: 13, aliases: ['FA Cup', 'Copa del Rey', 'DFB-Pokal', 'Coppa Italia', 'Coupe de France'] },
  { slug: 'international-friendlies', name: 'International Friendlies', nameHe: 'משחקי ידידות', tier: 14, aliases: ['International Friendlies', 'Club Friendlies', 'Friendlies'] },
];

const BASKETBALL: Seed[] = [
  { slug: 'nba', name: 'NBA', nameHe: 'NBA', tier: 1, aliases: ['NBA'] },
  { slug: 'wnba', name: 'WNBA', nameHe: 'WNBA', tier: 2, aliases: ['WNBA'] },
  { slug: 'euroleague', name: 'EuroLeague', nameHe: 'יורוליג', tier: 3, aliases: ['EuroLeague', 'Euroleague', 'Turkish Airlines EuroLeague'] },
  { slug: 'eurocup', name: 'EuroCup', nameHe: 'יורוקאפ', tier: 4, aliases: ['EuroCup', 'Basketball Champions League'] },
  { slug: 'fiba', name: 'FIBA Competitions', nameHe: 'תחרויות FIBA', tier: 5, aliases: ['FIBA World Cup', 'EuroBasket', 'AmeriCup', 'AfroBasket', 'FIBA'] },
  { slug: 'ncaa', name: 'NCAA', nameHe: 'NCAA', tier: 6, aliases: ['NCAA'] },
  { slug: 'national-leagues', name: 'National Leagues', nameHe: 'ליגות מקומיות', tier: 7, aliases: ['CEBL', 'BSN', 'LNB', 'LFB', 'NBL'] },
  { slug: 'olympic-basketball', name: 'Olympic Basketball', nameHe: 'כדורסל אולימפי', tier: 8, aliases: ['Olympic', 'Olympics'] },
  { slug: 'world-cup', name: 'FIBA World Cup', nameHe: 'מונדיאל כדורסל', tier: 9, aliases: [] }, // covered by 'fiba' bucket above; kept for nav parity with the user's list
];

const TENNIS: Seed[] = [
  { slug: 'atp-tour', name: 'ATP Tour', nameHe: 'טור ATP', tier: 1, aliases: ['ATP'] },
  { slug: 'wta-tour', name: 'WTA Tour', nameHe: 'טור WTA', tier: 2, aliases: ['WTA'] },
  { slug: 'australian-open', name: 'Australian Open', nameHe: 'האוסטרלי הפתוח', tier: 3, aliases: ['Australian Open'] },
  { slug: 'roland-garros', name: 'Roland Garros', nameHe: 'רולאן גארוס', tier: 4, aliases: ['Roland Garros', 'French Open'] },
  { slug: 'wimbledon', name: 'Wimbledon', nameHe: 'ווימבלדון', tier: 5, aliases: ['Wimbledon'] },
  { slug: 'us-open', name: 'US Open', nameHe: 'האמריקאי הפתוח', tier: 6, aliases: ['US Open'] },
  { slug: 'atp-finals', name: 'ATP Finals', nameHe: 'גמר העונה ATP', tier: 7, aliases: ['ATP Finals', 'Nitto ATP Finals'] },
  { slug: 'wta-finals', name: 'WTA Finals', nameHe: 'גמר העונה WTA', tier: 8, aliases: ['WTA Finals'] },
  { slug: 'davis-cup', name: 'Davis Cup', nameHe: 'גביע דייויס', tier: 9, aliases: ['Davis Cup'] },
  { slug: 'billie-jean-king-cup', name: 'Billie Jean King Cup', nameHe: 'גביע בילי ג\'ין קינג', tier: 10, aliases: ['Billie Jean King Cup', 'Fed Cup'] },
  { slug: 'atp-masters-1000', name: 'ATP Masters 1000', nameHe: 'מאסטרס 1000', tier: 11, aliases: ['Masters 1000', 'ATP Masters'] },
  { slug: 'atp-500', name: 'ATP 500', nameHe: 'ATP 500', tier: 12, aliases: ['ATP 500'] },
  { slug: 'atp-250', name: 'ATP 250', nameHe: 'ATP 250', tier: 13, aliases: ['ATP 250'] },
];

async function seedSport(sportKey: string, seeds: Seed[]) {
  for (const s of seeds) {
    await prisma.competition.upsert({
      where: { sportKey_slug: { sportKey, slug: s.slug } },
      update: { name: s.name, nameHe: s.nameHe, tier: s.tier, aliases: s.aliases },
      create: { sportKey, ...s },
    });
  }
  // Reserved catch-all — never matched via alias (resolveCompetition skips
  // slug "other" when scanning aliases), only ever assigned as a fallback.
  await prisma.competition.upsert({
    where: { sportKey_slug: { sportKey, slug: 'other' } },
    update: {},
    create: { sportKey, slug: 'other', name: 'Other', nameHe: 'אחר', tier: 999, aliases: [] },
  });
}

async function main() {
  await seedSport('football', FOOTBALL);
  await seedSport('basketball', BASKETBALL);
  await seedSport('tennis', TENNIS);
  console.log('Seeded competitions for football, basketball, tennis (+ "other" bucket each).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
