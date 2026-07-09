import { Link } from "react-router-dom";

import { LangToggle, TKey, useLang } from "../i18n";
import { OtherSportKey, otherSportsTheme } from "../theme/sportsTheme";

export default function OtherSports() {
  const { t } = useLang();
  return (
    <main className="sport-select">
      <div className="landing-toolbar">
        <LangToggle />
      </div>
      <Link to="/" className="back-link">
        {t("backToSports")}
      </Link>
      <h1 className="brand-hero small">{t("otherSports")}</h1>
      <div className="sport-grid">
        {(Object.keys(otherSportsTheme) as OtherSportKey[]).map((key) => {
          const theme = otherSportsTheme[key];
          return (
            <div key={key} className="sport-card-link">
              <div className="sport-card disabled" style={{ background: theme.background }}>
                <span className="sport-emoji">{theme.emoji}</span>
                <span className="sport-name">{t(`sport_${key}` as TKey)}</span>
                <span className="coming-soon">{t("comingSoon")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
