import { CSSProperties, ReactNode, Suspense, lazy } from "react";
import { Link } from "react-router-dom";

import { LangToggle, TKey, useLang } from "../i18n";
import { SportKey, sportsTheme } from "../theme/sportsTheme";

// Lazy-imported so three.js/@react-three/fiber ship as their own chunk,
// fetched only when a themed sport page actually renders — not part of the
// main bundle's initial parse/execute.
const SportBackgroundCanvas = lazy(() => import("../three/SportBackgroundCanvas"));

// Sets the per-sport CSS variables; everything inside styles itself off them.
export default function ThemeLayout({
  sport,
  children,
}: {
  sport: SportKey;
  children: ReactNode;
}) {
  const theme = sportsTheme[sport];
  const { t } = useLang();
  return (
    <div
      className="sport-layout"
      style={
        {
          "--sport-bg": theme.background,
          "--sport-accent": theme.accent,
          "--sport-accent-soft": theme.accentSoft,
        } as CSSProperties
      }
    >
      <Suspense fallback={null}>
        <SportBackgroundCanvas sport={sport} />
      </Suspense>
      <header className="sport-header">
        <Link to="/" className="brand">
          SportsWorld
        </Link>
        <div className="header-right">
          <span className="sport-badge">
            {theme.emoji} {t(`sport_${sport}` as TKey)}
          </span>
          <LangToggle />
        </div>
      </header>
      <div className="sport-content">{children}</div>
    </div>
  );
}
