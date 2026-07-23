import { Game, TennisMatch } from "@/lib/api";
import { SportKey } from "@/theme/sportsTheme";

// Homepage-only shape: the 5 parallel per-sport fetches page.tsx already
// needs for liveCounts, kept as full arrays (not just counts) so the same
// single fetch also feeds FeaturedMatchHero/LiveTrackerWidget — see the
// task brief's note not to fetch all 5 endpoints twice on one page load.
export interface HomeFeed {
  football: Game[];
  basketball: Game[];
  tennis: TennisMatch[];
  baseball: Game[];
  volleyball: Game[];
}

export const EMPTY_HOME_FEED: HomeFeed = {
  football: [],
  basketball: [],
  tennis: [],
  baseball: [],
  volleyball: [],
};

// A common, sport-agnostic shape both FeaturedMatchHero and
// LiveTrackerWidget consume, so neither has to branch on `Game` vs.
// `TennisMatch`. Tennis has no score fields at list level (its own
// MatchCard doesn't show a live score either — see components/match-card.tsx
// — so this mirrors existing, established behavior rather than inventing a
// new one) — `homeScore`/`awayScore`/`minute` are simply `null` for tennis.
export interface FeedItem {
  sport: SportKey;
  id: number;
  status: "scheduled" | "live" | "finished";
  time: string;
  competition: string;
  homeName: string;
  awayName: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeColor?: string;
  awayColor?: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  href: string;
  wsPath: string;
  // undefined for tennis (no isReal concept exposed there yet) — treated
  // as "unknown, don't label" rather than assumed simulated.
  isReal?: boolean;
}

type TeamSportKey = Exclude<SportKey, "tennis">;

function gameToItem(sport: TeamSportKey, g: Game): FeedItem {
  return {
    sport,
    id: g.id,
    status: g.status,
    time: g.kickoff,
    competition: g.competition,
    homeName: g.home_team.name,
    awayName: g.away_team.name,
    homeLogo: g.home_team.logo_url,
    awayLogo: g.away_team.logo_url,
    homeColor: g.home_team.primary_color,
    awayColor: g.away_team.primary_color,
    homeScore: g.home_score,
    awayScore: g.away_score,
    minute: g.minute,
    href: `/${sport}/games/${g.id}`,
    wsPath: `/ws/games/${sport}/${g.id}/`,
    isReal: g.is_real,
  };
}

function tennisToItem(m: TennisMatch): FeedItem {
  return {
    sport: "tennis",
    id: m.id,
    status: m.status,
    time: m.start_time,
    competition: m.tournament,
    homeName: m.player1.name,
    awayName: m.player2.name,
    homeScore: null,
    awayScore: null,
    minute: null,
    href: `/tennis/matches/${m.id}`,
    wsPath: `/ws/tennis/${m.id}/`,
  };
}

export function flattenHomeFeed(feed: HomeFeed): FeedItem[] {
  return [
    ...feed.football.map((g) => gameToItem("football", g)),
    ...feed.basketball.map((g) => gameToItem("basketball", g)),
    ...feed.tennis.map(tennisToItem),
    ...feed.baseball.map((g) => gameToItem("baseball", g)),
    ...feed.volleyball.map((g) => gameToItem("volleyball", g)),
  ];
}

// Priority: any live game first (earliest kickoff among the live ones);
// else the next upcoming game soonest by kickoff. Finished-only days (or a
// genuinely empty day) return null so the caller can fall back to a static
// hero — a finished match isn't a "wow" moment to lead with.
export function pickFeatured(items: FeedItem[]): FeedItem | null {
  const byTime = (a: FeedItem, b: FeedItem) => new Date(a.time).getTime() - new Date(b.time).getTime();

  const live = items.filter((i) => i.status === "live").sort(byTime);
  if (live.length > 0) return live[0];

  const upcoming = items.filter((i) => i.status === "scheduled").sort(byTime);
  if (upcoming.length > 0) return upcoming[0];

  return null;
}
