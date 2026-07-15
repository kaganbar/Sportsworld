"use client";

import GalaxyBackdrop from "./GalaxyBackdrop";
import Effects from "./Effects";
import WorldCameraRig from "./WorldCameraRig";
import Nebula from "./Nebula";
import { ZONES } from "./zones";
import FootballScene from "./FootballScene";
import BasketballScene from "./BasketballScene";
import TennisScene from "./TennisScene";
import BaseballScene from "./BaseballScene";
import VolleyballScene from "./VolleyballScene";

// The root scene for the whole persistent 3D world — mounted ONCE (see
// app/layout.tsx), replacing the old per-page SportBackgroundCanvas scene
// selection. All five sports' environments are always resident,
// positioned as separate "zones" (three/zones.ts) in one shared world, so
// switching sports is a real camera flythrough (WorldCameraRig) rather
// than a page/canvas swap. One shared GalaxyBackdrop/Effects instance for
// the whole world (previously one each per scene).
export default function PersistentWorld() {
  return (
    <>
      {/* Zones now span x=0 (football) to x=720 (volleyball) — 180-unit
          spacing across 5 zones. Centered on tennis (the middle zone,
          x=360) with radius grown enough to comfortably cover both ends. */}
      <group position={[360, 0, 0]}>
        <GalaxyBackdrop radius={520} count={2200} />
      </group>
      <Effects />
      <WorldCameraRig />

      <Nebula from="football" to="basketball" count={9} />
      <Nebula from="basketball" to="tennis" count={9} />
      <Nebula from="tennis" to="baseball" count={9} />
      <Nebula from="baseball" to="volleyball" count={9} />

      <group position={ZONES.football.offset}>
        <FootballScene />
      </group>
      <group position={ZONES.basketball.offset}>
        <BasketballScene />
      </group>
      <group position={ZONES.tennis.offset}>
        <TennisScene />
      </group>
      <group position={ZONES.baseball.offset}>
        <BaseballScene />
      </group>
      <group position={ZONES.volleyball.offset}>
        <VolleyballScene />
      </group>
    </>
  );
}
