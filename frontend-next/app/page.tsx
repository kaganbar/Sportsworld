import { Hero } from "@/components/hero";
import { HomeLive } from "@/components/home-live";
import { SportGrid } from "@/components/sport-grid";

/**
 * Homepage — the full-screen Hero, then the "pick a sport" grid, then a
 * cross-sport live/upcoming feed. The Hero's scroll cue points at the sections
 * below.
 */
export default function HomePage() {
  return (
    <main>
      <Hero />
      <SportGrid />
      <HomeLive />
    </main>
  );
}
