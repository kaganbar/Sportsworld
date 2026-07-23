"use client";

import { Globe } from "@/components/ui/cobe-globe";
import { useLang } from "@/lib/i18n";

// Real cities this app pulls live data from — not decorative placeholders.
// London/Madrid/Munich/Milan/Paris via Football-Data.org (13 competitions),
// Tel Aviv for the Ligat Ha'Al club/coach/roster data (real identity, see
// components/simulated-badge.tsx for what's still simulated there), Los
// Angeles via balldontlie (NBA), Rio via the 365scores scraper (Brasileirão
// is genuinely in-season right now, unlike the northern-hemisphere leagues).
const CITIES = [
  { id: "london", location: [51.5074, -0.1278] as [number, number], en: "London", he: "לונדון" },
  { id: "madrid", location: [40.4168, -3.7038] as [number, number], en: "Madrid", he: "מדריד" },
  { id: "munich", location: [48.1351, 11.582] as [number, number], en: "Munich", he: "מינכן" },
  { id: "milan", location: [45.4642, 9.19] as [number, number], en: "Milan", he: "מילאנו" },
  { id: "paris", location: [48.8566, 2.3522] as [number, number], en: "Paris", he: "פריז" },
  { id: "telaviv", location: [32.0853, 34.7818] as [number, number], en: "Tel Aviv", he: "תל אביב" },
  { id: "la", location: [34.0522, -118.2437] as [number, number], en: "Los Angeles", he: "לוס אנג'לס" },
  { id: "rio", location: [-22.9068, -43.1729] as [number, number], en: "Rio de Janeiro", he: "ריו דה ז'ניירו" },
];

const ARC_PAIRS: [string, string][] = [
  ["telaviv", "london"],
  ["telaviv", "la"],
  ["london", "madrid"],
  ["la", "rio"],
];

// --brand-accent (#38bdf8) as cobe's 0-1 RGB, reused for markers/arcs/glow
// so the globe reads as part of this app's existing palette rather than a
// bolted-on widget — the component's own defaults are tuned for a white
// background (see cobe-globe.demo.tsx), wrong for this app's dark theme.
const BRAND_ACCENT: [number, number, number] = [0.22, 0.74, 0.97];

export default function GlobalCoverageGlobe() {
  const { t, lang } = useLang();
  const cityById = new Map(CITIES.map((c) => [c.id, c]));

  const markers = CITIES.map((c) => ({ id: c.id, location: c.location, label: lang === "he" ? c.he : c.en }));
  const arcs = ARC_PAIRS.map(([fromId, toId]) => {
    const from = cityById.get(fromId)!;
    const to = cityById.get(toId)!;
    return { id: `${fromId}-${toId}`, from: from.location, to: to.location };
  });

  return (
    <div className="px-2 pb-12">
      <div className="glass-panel mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-[28px] p-8 text-center sm:flex-row sm:text-start">
        <div className="w-full max-w-[260px] shrink-0 sm:w-[260px]">
          <Globe
            markers={markers}
            arcs={arcs}
            dark={1}
            baseColor={[0.08, 0.1, 0.18]}
            markerColor={BRAND_ACCENT}
            arcColor={BRAND_ACCENT}
            glowColor={BRAND_ACCENT}
            mapBrightness={6}
          />
        </div>
        <div>
          <h2 className="mb-1.5 text-xl font-extrabold text-white">{t("globalCoverageTitle")}</h2>
          <p className="text-sm leading-relaxed text-white/60">{t("globalCoverageSubtitle")}</p>
        </div>
      </div>
    </div>
  );
}
