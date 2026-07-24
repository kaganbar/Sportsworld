"use client";

import { motion } from "framer-motion";
import { LangToggle, useLang } from "@/lib/i18n";
import { motion as tokensMotion } from "@/theme/tokens";
import { PitchBackground } from "./pitch-background";
import { ScrollCue } from "./scroll-cue";

/**
 * Phase 1 Hero — full-screen floodlit pitch with the SportsWorld wordmark.
 *
 * The wordmark uses the Anton display face (--font-anton) sized in vw so it
 * spans nearly edge-to-edge on any viewport, and enters with a fade + slight
 * scale-up (framer-motion, shared easing/timing from theme/tokens.ts). The
 * language toggle sits in the top inline-end corner (rtl-aware via `end-*`),
 * and the tagline + scroll cue pull their copy from the preserved i18n.
 */
export function Hero() {
  const { t } = useLang();

  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
      <PitchBackground />

      {/* Language toggle — top inline-end corner, flips sides under RTL */}
      <div className="absolute end-6 top-6 z-10">
        <LangToggle />
      </div>

      {/* Wordmark + tagline */}
      <div className="relative z-10 flex flex-col items-center px-[var(--hero-gutter,1.25rem)] text-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: tokensMotion.wordmarkDuration,
            ease: tokensMotion.easeSettle,
          }}
          className="font-display font-normal leading-[0.9] text-[color:var(--chalk)]"
          style={{
            fontSize: "clamp(2.75rem, 16.5vw, 15rem)",
            letterSpacing: "0.02em",
            // Chalky glow so the wordmark reads as floodlit paint on grass.
            textShadow:
              "0 0 40px rgba(198,255,74,0.18), 0 4px 30px rgba(0,0,0,0.45)",
          }}
        >
          SportsWorld
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.9, ease: tokensMotion.easeSettle }}
          className="mt-4 max-w-xl text-sm font-normal tracking-wide text-[color:var(--chalk-dim)] sm:text-base"
        >
          {t("heroTagline")}
        </motion.p>
      </div>

      <ScrollCue />
    </section>
  );
}
