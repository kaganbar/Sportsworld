/**
 * One-off enrichment: adds real player names/positions/jersey numbers for
 * the 10 Ligat Ha'Al (Israeli Premier League) clubs, sourced from
 * TheSportsDB's free v1 JSON API (key "123" — TheSportsDB's own published
 * free/test key, not a personal credential; see src/thesportsdb for the
 * client and its documented tier limits: ~10 players/team on
 * lookup_all_players.php, 30 req/min).
 *
 * TheSportsDB is used ONLY for what it uniquely offers here — real player
 * identities. Fixtures/live scores stay on this app's existing 365scores
 * scraper (src/scraper), which is comprehensive and unpaywalled; nothing
 * about fixture generation is touched by this script.
 *
 * SAFETY — read before changing anything below:
 * The initial seed (prisma/seed.ts) already generated, for its FICTIONAL
 * players: random season stats, random injuries (assigned in a loop over
 * each team's existing player pool), and MatchEvent goal/card rows tied to
 * specific playerIds in already-seeded fixtures. A real player must never
 * be attached to any of that. Concretely:
 *   - Real players are ALWAYS inserted as brand-new Player rows via
 *     `create()`. This script never UPDATEs an existing player's `name` —
 *     an existing fictional row's id may already be referenced by
 *     MatchEvent/Injury rows from the initial seed pass, so renaming it
 *     would retroactively attribute fabricated events to a real person.
 *   - Real players get seasonStats: null and no Injury row. This is safe
 *     by construction: this script runs after seed.ts's injury-assignment
 *     loop has already completed and only ever creates new rows, so real
 *     players simply didn't exist yet when injuries were randomly assigned
 *     — they can never have been picked.
 *   - isReal: true marks every row this script creates, so any future
 *     reseed/enrichment code can filter real players out of a random-
 *     selection pool without re-deriving "is this real" from scratch.
 *
 * Idempotent: re-running skips any (name, teamId, isReal: true) combination
 * that already exists, so it's safe to run more than once.
 *
 * Usage: npm run enrich:real-players
 * (requires the isReal/nullable-shirtNumber migration to be applied first —
 * see prisma/migrations/20260722222452_add_player_is_real)
 */
import { PrismaClient } from '@prisma/client';
import { searchTeam, listPlayers, sleep, TSDBPlayer } from '../src/thesportsdb/thesportsdb.client';

const prisma = new PrismaClient();

// Real club names as seeded (prisma/seed.ts's LIGAT_HAAL_TEAMS) mapped to
// this app's Team.name, which is what we look the team up by in our own DB.
const LIGAT_HAAL_CLUBS = [
  'Maccabi Haifa',
  'Maccabi Tel Aviv',
  "Hapoel Be'er Sheva",
  'Beitar Jerusalem',
  'Hapoel Tel Aviv',
  'Maccabi Petah Tikva',
  'Bnei Sakhnin',
  'Ashdod',
  'Hapoel Haifa',
  'Hapoel Jerusalem',
];

const RATE_LIMIT_DELAY_MS = 2500; // 30 req/min cap => well under with 2.5s spacing

// Hand-checked Hebrew transliterations for every player TheSportsDB returned
// for these 10 clubs at the time this script was written (verified against
// standard Hebrew-media spelling for the better-known Israeli internationals
// - e.g. Eran Zahavi, Ben Sahar, Ariel Harush, Baram Kayal, Itay Shechter -
// phonetic transliteration for foreign players and lesser-known domestic
// ones, consistent with this app's existing TRANSLATIONS_HE convention). If
// a future re-run surfaces a name not in this dictionary (roster changes),
// it's created without a Hebrew entry and simply falls back to the English
// name under lang=he, same as any other untranslated name in this app.
const REAL_PLAYER_TRANSLATIONS_HE: Record<string, string> = {
  // Maccabi Haifa
  'Abdoulaye Seck': 'עבדולאי סק',
  'Ali Mohamed': 'עלי מוחמד',
  'Cédric Don': "סדריק דון",
  'Daniel Sundgren': 'דניאל סונדגרן',
  'Dolev Haziza': 'דולב חזיזה',
  'Erik Shuranov': 'אריק שורנוב',
  'Etey Shechter': 'איתי שכטר',
  'Ethane Azoulay': 'איתן אזולאי',
  'Gadi Kinda': 'גאדי קינדה',
  'Goni Naor': 'גוני נאור',
  // Maccabi Tel Aviv
  'Benjamin Lederman': 'בנימין לדרמן',
  'Daniel Tenenbaum': 'דניאל טננבאום',
  'Denny Gropper': 'דני גרופר',
  'Dor Peretz': 'דור פרץ',
  'Elad Madmon': 'אלעד מדמון',
  'Emir Sahiti': 'אמיר סאהיטי',
  'Eran Zahavi': 'ערן זהבי',
  'Heitor': 'הייטור',
  'Hélio Varela': 'אליו וארלה',
  'Henry Addo': 'הנרי אדו',
  // Hapoel Be'er Sheva
  'Amir Ganah': 'אמיר גנאח',
  'Ben Sahar': 'בן סהר',
  'Dan Biton': 'דן ביטון',
  'Djibril Diop': "ג'יבריל דיופ",
  'Eitan Tibi': 'איתן טיבי',
  'Eliel Peretz': 'אליאל פרץ',
  'Guy Mizrahi': 'גיא מזרחי',
  'Hélder Oliveira Lopes': 'הלדר אוליווירה לופס',
  'Igor Zlatanović': "איגור זלטנוביץ'",
  'Joseph Sabobo': "ג'וזף סבובו",
  // Beitar Jerusalem
  'Adi Yona': 'עדי יונה',
  'Aílson Tavares': 'אילסון טברש',
  'Amir Berkovits': "אמיר ברקוביץ'",
  'Ange-Freddy Plumain': "אנז'-פרדי פלומן",
  'Arial Benabent Mendy': 'אריאל בנאבנט מנדי',
  'Ayi Kangni-Soukpe': 'איי קנגני-סוקפה',
  'Ben Bitton': 'בן ביטון',
  'Boris Enow': 'בוריס אנואו',
  'Brayan Carabalí Bonilla': 'בריאן קרבלי בוניה',
  'Dan Azaria': 'דן עזריה',
  // Hapoel Tel Aviv
  'Anas Mahamid': 'אנס מחאמיד',
  'Andrian Boykov Kraev': 'אנדריאן בויקוב קראייב',
  'Bryan Passi': 'בריאן פאסי',
  'Dan Einbinder': 'דן איינבינדר',
  'Doron Leidner': 'דורון ליידנר',
  'El Kancepolsky': 'אל קנצפולסקי',
  'Elian Rohana': 'אליאן רוחנה',
  'Emilijus Zubas': 'אמיליוס זובאס',
  'Emmanuel Boateng': 'עמנואל בואטנג',
  'Fernand Mayembo': 'פרנן מאיימבו',
  // Maccabi Petah Tikva
  'Amir Altury': 'אמיר אלתורי',
  'Antreas Karo': 'אנדראס קארו',
  'Ariel Lugassy': 'אריאל לוגסי',
  'Aviv Salem': 'אביב סלם',
  "Gal Ma'atuk": 'גל מעטוק',
  'Gideon Akawa': 'גדעון אקאווה',
  'Guy Deznet': 'גיא דזנט',
  'Hadar Fuchs': 'הדר פוקס',
  'Ido Cohen': 'עידו כהן',
  'Liran Hazan': 'לירן חזן',
  // Bnei Sakhnin
  'Abdalla Halaihal': 'עבדאללה חלאיחל',
  'Abed Yassin': 'עבד יאסין',
  'Adrian Păun': 'אדריאן פאון',
  'Ahmad Salman': 'אחמד סלמאן',
  'Ahmad Taha': 'אחמד טאהא',
  'Ahmed Ibrahim Salman': 'אחמד איברהים סלמאן',
  'Alon Azugi': 'אלון אזוגי',
  'Artur Miranyan': 'ארתור מיראניאן',
  'Aviv Solomon': 'אביב סלומון',
  'Baram Kayal': 'ברעם קיאל',
  // Ashdod
  'Abdul Mugeese': 'עבדול מוגיס',
  'Adir Levi': 'אדיר לוי',
  'Ariel Harush': 'אריאל הרוש',
  'Asaf Arania': 'אסף אראניה',
  'Avishay Cohen': 'אבישי כהן',
  'David Cuperman Coifman': "דייויד קופרמן קויפמן",
  'Dor Jan': "דור יאן",
  'Ebenezer Mamatah': 'אבנעזר ממטה',
  'Elad Shahaf': 'אלעד שחף',
  'Emmanuel Agyei': "עמנואל אג'יי",
  // Hapoel Haifa
  'Abdou Ag Jiddou': "עבדו אג ג'ידו",
  'Aharon Nawi Nabi': 'אהרון נאווי נאבי',
  'Alon Turgeman': "אלון תורג'מן",
  'Andrija Radulović': "אנדריה רדולוביץ'",
  'Anis Ayias': 'אניס איאס',
  'Bar Lin': 'בר לין',
  'Bruno Almeida': 'ברונו אלמיידה',
  'Dario Župarić': "דריו ז'ופאריץ'",
  'Denis Polyakov': 'דניס פוליאקוב',
  'Dmitri Antilevskiy': 'דמיטרי אנטילבסקי',
  // Hapoel Jerusalem
  'Adebayo Adeleye': 'אדבאיו אדלייה',
  'Andrew Idoko': 'אנדרו אידוקו',
  'Awka Ashta': 'אווקה אשתא',
  'Ayano Farada': 'איאנו פראדה',
  'Eloge Koffi Yao Guy': "אלוז' קופי יאו גי",
  'Guy Badash': 'גיא בדש',
  'Harel Shalom': 'הראל שלום',
  'Ido Oli': 'עידו אולי',
  'Ilay Madmon': 'אילאי מדמון',
  'Karem Zoabi': 'כרם זועבי',
};

/** Maps TheSportsDB's free-text `strPosition` (e.g. "Centre-Back",
 * "Defensive Midfield", "Left Wing") onto this app's existing GK/DF/MF/FW
 * vocabulary (see FOOTBALL_SQUAD_TEMPLATE in prisma/seed.ts). Falls back to
 * "MF" for blank/unrecognized values rather than failing the whole player. */
function mapPosition(pos: string | undefined | null): string {
  const p = (pos ?? '').toLowerCase();
  if (p.includes('goalkeeper') || p.includes('keeper')) return 'GK';
  if (p.includes('back') || p.includes('defen')) return 'DF';
  if (p.includes('midfield')) return 'MF';
  if (p.includes('forward') || p.includes('attack') || p.includes('striker') || p.includes('wing')) return 'FW';
  return 'MF';
}

/** Parses TheSportsDB's `strNumber` (often null/"" on the free tier) into a
 * positive integer, or null if absent/unparseable. Collision against an
 * existing squadmate's number is checked separately by the caller. */
function parseShirtNumber(raw: string | undefined | null): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n > 0 ? n : null;
}

/** Looks up a club on TheSportsDB. Tries the exact name first; Israeli
 * football and basketball clubs frequently share a "Hapoel <city>" name, so
 * a bare search can resolve to the wrong sport (confirmed live: "Hapoel
 * Be'er Sheva" and "Hapoel Tel Aviv" both resolve to their Basketball
 * Premier League namesakes on the plain query) — retrying with an " FC"
 * suffix reliably disambiguates to the football club. */
async function findFootballTeam(clubName: string) {
  const primary = await searchTeam(clubName);
  if (primary && primary.strLeague !== 'Israeli Basketball Premier League') return primary;
  await sleep(RATE_LIMIT_DELAY_MS);
  const withFc = await searchTeam(`${clubName} FC`);
  if (withFc && withFc.strLeague !== 'Israeli Basketball Premier League') return withFc;
  return null;
}

async function enrichClub(clubName: string) {
  const team = await prisma.team.findUnique({ where: { name: clubName } });
  if (!team) {
    console.log(`[skip] ${clubName}: no matching Team row in this app's DB (check LIGAT_HAAL_TEAMS in seed.ts).`);
    return;
  }

  const tsdbTeam = await findFootballTeam(clubName);
  await sleep(RATE_LIMIT_DELAY_MS);
  if (!tsdbTeam) {
    console.log(`[skip] ${clubName}: not found on TheSportsDB (or only a non-football namesake was found).`);
    return;
  }

  const tsdbPlayers: TSDBPlayer[] = await listPlayers(tsdbTeam.idTeam);
  await sleep(RATE_LIMIT_DELAY_MS);
  if (tsdbPlayers.length === 0) {
    console.log(`[skip] ${clubName}: TheSportsDB team "${tsdbTeam.strTeam}" (id ${tsdbTeam.idTeam}) has no roster data.`);
    return;
  }

  const existingPlayers = await prisma.player.findMany({ where: { teamId: team.id } });
  const existingRealNames = new Set(existingPlayers.filter((p) => p.isReal).map((p) => p.name));
  const takenShirtNumbers = new Set(existingPlayers.map((p) => p.shirtNumber).filter((n): n is number => n != null));

  let inserted = 0;
  let alreadyPresent = 0;
  let translationsAdded = 0;

  for (const tp of tsdbPlayers) {
    if (existingRealNames.has(tp.strPlayer)) {
      alreadyPresent++;
      continue;
    }

    let shirtNumber = parseShirtNumber(tp.strNumber);
    if (shirtNumber != null && takenShirtNumbers.has(shirtNumber)) {
      shirtNumber = null; // collision with an existing squadmate's number — leave unset rather than error
    }

    await prisma.player.create({
      data: {
        teamId: team.id,
        name: tp.strPlayer,
        position: mapPosition(tp.strPosition),
        shirtNumber: shirtNumber ?? undefined,
        seasonStats: undefined, // stays null — no fabricated stats for a real player
        isReal: true,
      },
    });
    if (shirtNumber != null) takenShirtNumbers.add(shirtNumber);
    inserted++;

    const he = REAL_PLAYER_TRANSLATIONS_HE[tp.strPlayer];
    if (he) {
      await prisma.nameTranslation.upsert({
        where: { sourceText: tp.strPlayer },
        update: { translatedText: he, category: 'player' },
        create: { sourceText: tp.strPlayer, translatedText: he, category: 'player' },
      });
      translationsAdded++;
    }
  }

  console.log(
    `[done] ${clubName} (TheSportsDB "${tsdbTeam.strTeam}", id ${tsdbTeam.idTeam}): ` +
      `${tsdbPlayers.length} players returned, ${inserted} inserted, ${alreadyPresent} already present, ` +
      `${translationsAdded} Hebrew translations added.`,
  );
}

async function main() {
  for (const clubName of LIGAT_HAAL_CLUBS) {
    await enrichClub(clubName);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
