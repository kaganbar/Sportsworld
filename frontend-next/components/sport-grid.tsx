"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLang, type TKey } from "@/lib/i18n";
import { SPORT_ORDER, SportKey, sportsTheme } from "@/theme/sportsTheme";

const TAGLINE_KEY: Record<SportKey, TKey> = {
  football: "tagline_football",
  basketball: "tagline_basketball",
  tennis: "tagline_tennis",
  baseball: "tagline_baseball",
  volleyball: "tagline_volleyball",
};

/**
 * The "pick a sport" section below the Hero — a card per sport, each linking to
 * its landing page, glowing in the sport's own accent on hover. Cards reveal on
 * a small stagger as the section scrolls into view.
 */
export function SportGrid() {
  const { t } = useLang();

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center font-display text-3xl tracking-wide text-[color:var(--chalk)] sm:text-4xl"
      >
        {t("todaysGames")}
      </motion.h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SPORT_ORDER.map((key, i) => {
          const s = sportsTheme[key];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
            >
              <Link
                href={s.route}
                className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center transition-all hover:-translate-y-1 hover:border-white/20"
                style={{ ["--sg" as string]: s.glow }}
              >
                <span
                  className="grid h-16 w-16 place-items-center rounded-2xl text-4xl ring-1 ring-inset ring-white/10 transition-shadow group-hover:shadow-[0_0_44px_-8px_var(--sg)]"
                  style={{ background: `${s.accent}14` }}
                >
                  {s.icon}
                </span>
                <span className="font-display text-xl tracking-wide text-[color:var(--chalk)]">
                  {t(s.labelKey)}
                </span>
                <span className="text-xs text-[color:var(--chalk-dim)]">{t(TAGLINE_KEY[key])}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
