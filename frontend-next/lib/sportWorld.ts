import { SportKey } from "@/theme/sportsTheme";

// Phase 3 "Sport World" data — the countries a sport's interactive globe
// highlights, each with the real backend competition slugs its leagues route
// to (verified against GET /api/competitions). Clicking a league navigates to
// the existing /{sport}/{slug} competition hub, so this is a new *entry* into
// pages that already exist, not a parallel data layer.
export interface WorldLeague {
  name: string;
  nameHe: string;
  slug: string;
}
export interface WorldCountry {
  id: string;
  name: string;
  nameHe: string;
  lat: number;
  lng: number;
  leagues: WorldLeague[];
}

export const SPORT_WORLD: Partial<Record<SportKey, WorldCountry[]>> = {
  football: [
    {
      id: "england",
      name: "England",
      nameHe: "אנגליה",
      lat: 52.3555,
      lng: -1.1743,
      leagues: [{ name: "Premier League", nameHe: "פרמייר ליג", slug: "premier-league" }],
    },
    {
      id: "spain",
      name: "Spain",
      nameHe: "ספרד",
      lat: 40.4168,
      lng: -3.7038,
      leagues: [{ name: "La Liga", nameHe: "לה ליגה", slug: "la-liga" }],
    },
    {
      id: "italy",
      name: "Italy",
      nameHe: "איטליה",
      lat: 41.8719,
      lng: 12.5674,
      leagues: [{ name: "Serie A", nameHe: "סריה A", slug: "serie-a" }],
    },
    {
      id: "germany",
      name: "Germany",
      nameHe: "גרמניה",
      lat: 51.1657,
      lng: 10.4515,
      leagues: [{ name: "Bundesliga", nameHe: "בונדסליגה", slug: "bundesliga" }],
    },
    {
      id: "france",
      name: "France",
      nameHe: "צרפת",
      lat: 46.2276,
      lng: 2.2137,
      leagues: [{ name: "Ligue 1", nameHe: "ליג 1", slug: "ligue-1" }],
    },
    {
      id: "israel",
      name: "Israel",
      nameHe: "ישראל",
      lat: 31.4118,
      lng: 35.0818,
      leagues: [{ name: "Ligat Ha'Al", nameHe: "ליגת העל", slug: "ligat-haal" }],
    },
    {
      id: "usa",
      name: "USA",
      nameHe: 'ארה"ב',
      lat: 39.8283,
      lng: -98.5795,
      leagues: [{ name: "MLS", nameHe: "MLS", slug: "mls" }],
    },
    {
      id: "saudi",
      name: "Saudi Arabia",
      nameHe: "ערב הסעודית",
      lat: 23.8859,
      lng: 45.0792,
      leagues: [{ name: "Saudi Pro League", nameHe: "ליגת העל הסעודית", slug: "saudi-pro-league" }],
    },
  ],
};
