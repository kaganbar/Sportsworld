import axios from 'axios';
import * as cheerio from 'cheerio';

// Confirmed by fetching directly: transfermarkt.com/statistik/geruechte
// returns a 502 (bot-detection-shaped response) without a full browser-like
// header set, but the real page — found via the homepage's own nav links —
// is /geruechte/aktuellegeruechte/statistik, which returns server-rendered
// HTML with the real rumour table once Accept/Accept-Language headers are
// present alongside a browser User-Agent.
const URL = 'https://www.transfermarkt.com/geruechte/aktuellegeruechte/statistik';
const BASE = 'https://www.transfermarkt.com';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export interface RawTransferRumour {
  playerName: string;
  playerUrl: string;
  fromClub: string | null;
  toClub: string;
  competition: string | null;
  reportedAt: Date;
  probability: number | null;
  // The rumor's own discussion-thread URL when Transfermarkt links one;
  // otherwise a synthetic-but-stable string built from player+club+time, so
  // every rumour still has a natural dedup key (TransferReport.sourceUrl is
  // @unique) even without a real thread link.
  sourceUrl: string;
}

function parseDate(raw: string): Date {
  // "10.07.2026 - 18:37"
  const [datePart, timePart] = raw.split(' - ').map((s) => s.trim());
  const [day, month, year] = datePart.split('.').map(Number);
  const [hour, minute] = (timePart ?? '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export async function fetchTransferRumours(): Promise<RawTransferRumour[]> {
  const response = await axios.get<string>(URL, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(response.data);
  const rumours: RawTransferRumour[] = [];

  $('table.items > tbody > tr').each((_, row) => {
    const cells = $(row).children('td');
    if (cells.length < 7) return;

    const playerLink = cells.eq(0).find('table.inline-table a').first();
    const playerName = playerLink.text().trim();
    const playerHref = playerLink.attr('href');
    if (!playerName || !playerHref) return;

    const fromClub = cells.eq(3).find('a[title]').first().attr('title') ?? null;

    // The "interested club" cell nests 3 a[title] links: [0] the club logo,
    // [1] the club name again (hauptlink text), [2] the actual competition —
    // easy to misread as 2 links if you only look at the rendered text.
    const toClubCell = cells.eq(4);
    const toClubLinks = toClubCell.find('table.inline-table a[title]');
    const toClub = toClubLinks.eq(0).attr('title');
    if (!toClub) return;
    const competition = toClubLinks.eq(2).attr('title') ?? null;

    const reportedAtRaw = cells.eq(5).text().trim();
    if (!reportedAtRaw) return;
    const reportedAt = parseDate(reportedAtRaw);

    const assessmentCell = cells.eq(6);
    const assessmentText = assessmentCell.text().trim();
    const probMatch = assessmentText.match(/(\d+)\s*%/);
    const probability = probMatch ? Number(probMatch[1]) : null;

    const threadHref = assessmentCell.find('a[href*="/thread/forum/"]').attr('href');
    const sourceUrl = threadHref ?? `${BASE}${playerHref}#${encodeURIComponent(toClub)}@${reportedAtRaw}`;

    rumours.push({
      playerName,
      playerUrl: `${BASE}${playerHref}`,
      fromClub,
      toClub,
      competition,
      reportedAt,
      probability,
      sourceUrl,
    });
  });

  return rumours;
}
