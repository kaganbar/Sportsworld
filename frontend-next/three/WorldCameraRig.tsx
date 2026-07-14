"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PerspectiveCamera } from "three";
import { ZONES, ZoneKey, HOME_CAMERA } from "./zones";
import { useActiveZone, ActiveZone } from "@/lib/world-zone";
import { easeInOutCubic } from "./easing";

// Owns the camera entirely for the whole persistent world — replaces each
// scene's own CameraDrift (4 different components fighting to set
// camera.position every frame isn't viable once all 3 zones share one
// canvas). On zone change (route navigation) it tweens position/lookAt/fov
// from the old dock point to the new one over TRANSITION_DURATION; while
// docked (not transitioning) it reproduces the exact same subtle sway each
// scene's old CameraDrift had, centered on the zone's offset instead of
// world origin.
// Zone spacing tripled (60 -> 180 units) for the real-meter scale rebuild,
// so the transition duration is bumped proportionally to keep the dolly
// reading as a deliberate cinematic move rather than a jarring warp —
// verified visually via a screenshot burst, not purely computed.
const TRANSITION_DURATION = 3.2; // seconds
const Y_SWAY_AMP = 0.3;
const Y_SWAY_SPEED = 0.05;

interface Dock {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
}

function dockFor(zone: ActiveZone): Dock {
  if (zone === "home") {
    return {
      position: new THREE.Vector3(...HOME_CAMERA.position),
      lookAt: new THREE.Vector3(...ZONES.basketball.offset),
      fov: HOME_CAMERA.fov,
    };
  }
  const z = ZONES[zone as ZoneKey];
  return {
    position: new THREE.Vector3(z.offset[0], z.camera.y, z.offset[2] + z.camera.z),
    lookAt: new THREE.Vector3(...z.offset),
    fov: z.camera.fov,
  };
}

export default function WorldCameraRig() {
  const { camera } = useThree();
  const activeZone = useActiveZone();
  const prevZoneRef = useRef<ActiveZone>(activeZone);
  const dockedRef = useRef<Dock>(dockFor(activeZone));
  const transitionRef = useRef<{ from: Dock; to: Dock; elapsed: number } | null>(null);

  useEffect(() => {
    if (activeZone !== prevZoneRef.current) {
      transitionRef.current = { from: dockedRef.current, to: dockFor(activeZone), elapsed: 0 };
      prevZoneRef.current = activeZone;
    }
  }, [activeZone]);

  useFrame(({ clock }, delta) => {
    const cam = camera as PerspectiveCamera;
    const t = clock.getElapsedTime();

    if (transitionRef.current) {
      const tr = transitionRef.current;
      tr.elapsed += delta;
      const progress = Math.min(tr.elapsed / TRANSITION_DURATION, 1);
      const eased = easeInOutCubic(progress);

      camera.position.copy(tr.from.position).lerp(tr.to.position, eased);
      const look = tr.from.lookAt.clone().lerp(tr.to.lookAt, eased);
      camera.lookAt(look);

      const fov = THREE.MathUtils.lerp(tr.from.fov, tr.to.fov, eased);
      if (Math.abs(cam.fov - fov) > 0.01) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }

      if (progress >= 1) {
        dockedRef.current = tr.to;
        transitionRef.current = null;
      }
      return;
    }

    const docked = dockedRef.current;
    if (activeZone === "home") {
      camera.position.copy(docked.position);
      camera.lookAt(docked.lookAt);
      return;
    }

    const zoneConf = ZONES[activeZone as ZoneKey];
    const swayX = Math.sin(t * zoneConf.camera.swayXSpeed) * zoneConf.camera.swayXAmp;
    const swayY = Math.sin(t * Y_SWAY_SPEED) * Y_SWAY_AMP;
    camera.position.set(docked.position.x + swayX, docked.position.y + swayY, docked.position.z);
    camera.lookAt(docked.lookAt);
  });

  return null;
}
