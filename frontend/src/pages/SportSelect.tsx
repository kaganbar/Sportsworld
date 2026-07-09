import { Link } from "react-router-dom";

import { LangToggle, TKey, useLang } from "../i18n";
import { SportKey, sportsTheme } from "../theme/sportsTheme";

export default function SportSelect() {
  const { t } = useLang();
  return (
    <main className="sport-select">
      <div className="landing-toolbar">
        <LangToggle />
      </div>
      <h1 className="brand-hero">SportsWorld</h1>
      <p className="tagline">{t("tagline")}</p>
      <div className="sport-grid">
        {(Object.keys(sportsTheme) as SportKey[]).map((key) => {
          const theme = sportsTheme[key];
          const card = (
            <div
              className={`sport-card${theme.available ? "" : " disabled"}`}
              style={{ background: theme.background }}
            >
              <span className="sport-emoji">{theme.emoji}</span>
              <span className="sport-name">{t(`sport_${key}` as TKey)}</span>
              {!theme.available && (
                <span className="coming-soon">{t("comingSoon")}</span>
              )}
            </div>
          );
          return theme.available ? (
            <Link key={key} to={`/${key}`} className="sport-card-link">
              {card}
            </Link>
          ) : (
            <div key={key} className="sport-card-link">
              {card}
            </div>
          );
        })}
      </div>
    </main>
  );
}
