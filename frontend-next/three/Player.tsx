"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { seededRandom } from "./rng";

// Xbot.glb is three.js's own bundled example rig (MIT-licensed repo) — a
// neutral, un-costumed mannequin with idle/walk/run clips already baked in.
// It's recolored per-instance below rather than reproducing any real kit
// graphics/logos, and reused via SkeletonUtils.clone so many independently
// animated players can share one loaded/parsed asset.
const MODEL_URL = "/models/xbot.glb";

export type PlayerAnimation = "idle" | "walk" | "run" | "kick" | "shoot" | "dive" | "swing";

// --- Hand-authored sport-action clips ---
//
// xbot.glb only bakes in idle/walk/run (+ a few unused gesture clips) — no
// kick/shoot/dive/racket-swing. Sourcing real mocap for those would need a
// Mixamo account and FBX->glTF retargeting tooling that isn't available in
// this environment, so these are instead built directly as THREE
// AnimationClips against the rig's own real bone names (confirmed via
// parsing xbot.glb's JSON chunk — it's an actual Mixamo skeleton, bones
// prefixed "mixamorig:"), played through the same AnimationMixer every
// other clip already uses. Stylized, not mocap-quality — enough to read as
// a distinct action from the background-canvas viewing distance.
function eulerQuat(x: number, y: number, z: number): [number, number, number, number] {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return [q.x, q.y, q.z, q.w];
}

function quatTrack(bone: string, times: number[], eulers: [number, number, number][]): THREE.QuaternionKeyframeTrack {
  const values = eulers.flatMap(([x, y, z]) => eulerQuat(x, y, z));
  return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
}

const B = "mixamorig:";

// Quaternion tracks only support linear (slerp) interpolation in this
// three.js build (confirmed via source: QuaternionKeyframeTrack explicitly
// sets InterpolantFactoryMethodSmooth = undefined — a cubic spline over raw
// quaternion components isn't valid, so THREE.InterpolateSmooth isn't an
// option here). The real, valid way to fake easing + follow-through is
// denser, non-uniformly-spaced keyframes and staggered per-limb timing
// (a limb leads, the torso/counter-limb follows a beat later) — every clip
// below adds a settle/overshoot-decay frame at the tail and offsets torso
// timing from the driving limb, rather than relying on the interpolant.

// A football kick: right leg winds up, swings through contact, follows
// through and settles; torso counter-leans a beat after the leg, arms fling
// out for balance and ease back down.
const kickClip = new THREE.AnimationClip("kick", 0.75, [
  quatTrack(
    `${B}RightUpLeg`,
    [0, 0.15, 0.2, 0.35, 0.45, 0.6, 0.75],
    [[0.3, 0, 0], [0.32, 0, 0], [-0.6, 0, 0], [-0.9, 0, 0], [-0.7, 0, 0], [0.1, 0, 0], [0, 0, 0]]
  ),
  quatTrack(
    `${B}RightLeg`,
    [0, 0.2, 0.35, 0.45, 0.6, 0.75],
    [[0.2, 0, 0], [-0.1, 0, 0], [0, 0, 0], [0.05, 0, 0], [0.1, 0, 0], [0.02, 0, 0]]
  ),
  // Torso peaks at 0.45 — a beat after the leg's 0.35 contact peak, so the
  // counter-lean reads as a reaction to the kick rather than simultaneous.
  quatTrack(`${B}Spine`, [0, 0.2, 0.45, 0.6, 0.75], [[-0.05, 0, 0], [0, 0, 0], [0.15, 0, 0], [0.06, 0, 0], [0, 0, 0]]),
  quatTrack(`${B}LeftArm`, [0, 0.35, 0.5, 0.75], [[0, 0, -0.2], [0, 0, -0.5], [0, 0, -0.35], [0, 0, -0.2]]),
  quatTrack(`${B}RightArm`, [0, 0.35, 0.5, 0.75], [[0, 0, 0.2], [0, 0, 0.5], [0, 0, 0.35], [0, 0, 0.2]]),
]);

// A basketball jump shot: crouch, extend upward, arms rise to a release
// point overhead, follow-through with a slight wrist-flick decay on the way
// back down instead of snapping straight to neutral.
const shootClip = new THREE.AnimationClip("shoot", 0.85, [
  quatTrack(`${B}LeftUpLeg`, [0, 0.3, 0.55, 0.85], [[0.3, 0, 0], [0, 0, 0], [0.15, 0, 0], [0.25, 0, 0]]),
  quatTrack(`${B}RightUpLeg`, [0, 0.3, 0.55, 0.85], [[0.3, 0, 0], [0, 0, 0], [0.15, 0, 0], [0.25, 0, 0]]),
  quatTrack(`${B}LeftArm`, [0, 0.4, 0.55, 0.7, 0.85], [[0, 0, -0.3], [0, 0, -1.6], [0, 0, -1.75], [0, 0, -1.4], [0, 0, -1.2]]),
  quatTrack(`${B}RightArm`, [0, 0.4, 0.55, 0.7, 0.85], [[0, 0, 0.3], [0, 0, 1.6], [0, 0, 1.75], [0, 0, 1.4], [0, 0, 1.2]]),
  quatTrack(`${B}LeftForeArm`, [0, 0.4, 0.55, 0.85], [[0, -1.1, 0], [0, -0.2, 0], [0, -0.5, 0], [0, -0.4, 0]]),
  quatTrack(`${B}RightForeArm`, [0, 0.4, 0.55, 0.85], [[0, 1.1, 0], [0, 0.2, 0], [0, 0.5, 0], [0, 0.4, 0]]),
  // Spine settles a beat after the arms' 0.55 release peak.
  quatTrack(`${B}Spine`, [0, 0.4, 0.55, 0.7, 0.85], [[0.1, 0, 0], [-0.1, 0, 0], [-0.15, 0, 0], [-0.05, 0, 0], [0, 0, 0]]),
]);

// A goalkeeper-style lateral dive: torso and hips roll to one side, arm
// reaches out, held down briefly before a settling recovery instead of
// snapping back.
const diveClip = new THREE.AnimationClip("dive", 0.95, [
  quatTrack(
    `${B}Spine`,
    [0, 0.35, 0.6, 0.8, 0.95],
    [[0, 0, 0], [0.2, 0, 0.7], [0.3, 0, 0.9], [0.2, 0, 0.6], [0.15, 0, 0.45]]
  ),
  quatTrack(
    `${B}Spine1`,
    [0, 0.35, 0.6, 0.8, 0.95],
    [[0, 0, 0], [0.1, 0, 0.4], [0.15, 0, 0.5], [0.1, 0, 0.35], [0.08, 0, 0.28]]
  ),
  quatTrack(
    `${B}RightArm`,
    [0, 0.3, 0.6, 0.8, 0.95],
    [[0, 0, 0.3], [0, 0.2, 1.2], [0, 0.3, 1.4], [0, 0.2, 1.1], [0, 0.15, 1.0]]
  ),
  // Hips lag half a beat behind the spine's lean, a real weight-shift cue.
  quatTrack(`${B}Hips`, [0, 0.45, 0.8, 0.95], [[0, 0, 0], [0, 0.3, 0.3], [0, 0.25, 0.25], [0, 0.22, 0.22]]),
  quatTrack(`${B}RightUpLeg`, [0, 0.3, 0.8, 0.95], [[0, 0, 0], [-0.4, 0, 0.3], [-0.2, 0, 0.2], [-0.15, 0, 0.15]]),
]);

// A tennis forehand swing: arm winds up behind the body, sweeps through
// contact, follows through across the torso and eases back rather than
// stopping dead at the last keyframe; spine rotates through the hit a beat
// ahead of the arm (the hip/torso turn drives the racket, not the reverse).
const swingClip = new THREE.AnimationClip("swing", 0.75, [
  quatTrack(
    `${B}RightArm`,
    [0, 0.25, 0.45, 0.6, 0.75],
    [[0.2, -0.6, -1.3], [-0.2, 0.5, 0.9], [-0.4, 1.0, 1.5], [-0.35, 0.9, 1.35], [-0.15, 0.5, 0.8]]
  ),
  quatTrack(`${B}RightForeArm`, [0, 0.25, 0.45, 0.6, 0.75], [[0, 0, -0.9], [0, 0, -0.1], [0, 0, -0.4], [0, 0, -0.3], [0, 0, -0.1]]),
  // Spine leads the arm: peaks at 0.45 vs. the arm's 0.45-0.6 contact zone.
  quatTrack(`${B}Spine`, [0, 0.2, 0.45, 0.6, 0.75], [[0, -0.5, 0], [0, 0.1, 0], [0, 0.4, 0], [0, 0.6, 0], [0, 0.3, 0]]),
  quatTrack(`${B}LeftArm`, [0, 0.25, 0.45, 0.75], [[0, 0, -0.3], [0, 0, -0.8], [0, 0, -0.6], [0, 0, -0.35]]),
]);

const SPORT_CLIPS: Partial<Record<PlayerAnimation, THREE.AnimationClip>> = {
  kick: kickClip,
  shoot: shootClip,
  dive: diveClip,
  swing: swingClip,
};

export interface OrbitPath {
  radius: number;
  speed: number;
  offset: number;
  zScale?: number;
  y?: number;
}

// Linear back-and-forth motion along one axis (e.g. a tennis baseline rally),
// as opposed to orbit's circular path.
export interface SwayPath {
  base: [number, number, number];
  axis: "x" | "z";
  amplitude: number;
  speed: number;
  offset: number;
  facingY: number;
}

// A formation-slot target (real-meter court/pitch coordinates) the player
// eases toward with real momentum, replacing the circular orbit/sway paths
// for tactical positioning — see three/formations.ts. Unlike orbit/sway
// (which compute position directly from elapsed time), this is velocity-
// based: Player.tsx accelerates/decelerates toward it and syncs the run
// clip's stride rate to the actual ground speed achieved.
export interface TargetPath {
  x: number;
  z: number;
  maxSpeed?: number; // m/s, defaults to a believable jog
  // Fixed facing override — when a player mostly shuffles laterally (e.g.
  // a tennis baseliner covering side to side) they keep facing the net,
  // not whichever way they happen to be stepping; omit to face the
  // direction of travel instead (the default, right for a pitch/court
  // player moving toward a new position).
  facingY?: number;
}

const RUN_REF_SPEED = 3.3; // m/s the baked "run" clip's stride cycle matches at timeScale 1
const ACCEL = 3.2; // m/s^2 — real human accel/decel, not an instant speed change

interface PlayerProps {
  color: string;
  animation?: PlayerAnimation;
  speed?: number;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  orbit?: OrbitPath;
  sway?: SwayPath;
  target?: TargetPath;
}

// xbot.glb bakes in two gesture clips ("agree", "headShake") this project
// never used — every player just sat perfectly still in "idle". Playing
// them occasionally is a zero-asset way to break up an otherwise frozen
// loop (see the plan's Context section: no real physics/mocap idle variety
// is achievable here, but using clips that already exist in the file is).
const IDLE_GESTURES = ["agree", "headShake"] as const;

export default function Player({
  color,
  animation = "run",
  speed = 1,
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  orbit,
  sway,
  target,
}: PlayerProps) {
  const { scene, animations } = useGLTF(MODEL_URL);
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, group);
  // Hand-authored sport-action clips aren't part of the loaded GLTF, so
  // `actions` (built by useAnimations from `animations`) doesn't know about
  // them — registered directly on the same mixer instead, once per mount.
  const customActions = useRef<Partial<Record<PlayerAnimation, THREE.AnimationAction>>>({});
  // orbit/sway offsets are already unique per instance (each caller assigns
  // a distinct phase) — reused here as a stable per-player seed so parallel
  // players' clip speed and idle-gesture timing don't read as perfectly
  // synchronized loops.
  const seedRef = useRef(orbit?.offset ?? sway?.offset ?? Math.random() * 100);
  // Current real-world ground speed (m/s) while in target mode — read by
  // both the stride-speed sync (below) and the idle-gesture trigger (a
  // player settled near their formation slot can glance around/gesture
  // just like one explicitly marked "idle").
  const velRef = useRef(0);
  const gestureRef = useRef<{
    phase: "idle" | "gesture";
    nextAt: number;
    endAt: number;
    active: THREE.AnimationAction | null;
  }>({ phase: "idle", nextAt: 4 + seededRandom(seedRef.current) * 8, endAt: 0, active: null });

  useEffect(() => {
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const material = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mesh.isMesh && material && "color" in material) {
        mesh.material = material.clone();
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(color);
        // The source glb's joint material ships at metalness 0.5 — a bit
        // shiny/plastic-toy at this camera distance. Softening it (no other
        // per-part material split exists in this asset to differentiate
        // skin from kit — confirmed by inspecting the glb directly) reads
        // closer to matte fabric/skin.
        if (mat.metalness > 0.2) mat.metalness = 0.15;
      }
    });
  }, [cloned, color]);

  useEffect(() => {
    if (!group.current) return;
    for (const [name, clip] of Object.entries(SPORT_CLIPS)) {
      const action = mixer.clipAction(clip, group.current);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      customActions.current[name as PlayerAnimation] = action;
    }
  }, [mixer]);

  useEffect(() => {
    const action = actions[animation] ?? customActions.current[animation];
    // +/-7.5% per-instance speed jitter (seeded, so it's stable for this
    // player rather than re-rolled every render) — parallel players running
    // the same clip no longer move in perfect lockstep.
    const jitter = 1 + (seededRandom(seedRef.current) - 0.5) * 0.15;
    action?.reset().fadeIn(0.2).setEffectiveTimeScale(speed * jitter).play();
    return () => {
      action?.fadeOut(0.2);
      // Switching away from "idle" mid-gesture (e.g. a kick/shoot trigger
      // fires) should cut the gesture short instead of leaving it playing
      // underneath the new action.
      const g = gestureRef.current;
      if (g.phase === "gesture") {
        g.active?.fadeOut(0.15);
        g.phase = "idle";
      }
    };
  }, [actions, animation, speed]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;

    // Idle-gesture variation: while explicitly idling, OR while settled
    // near a formation slot (target mode, velocity near zero) — a player
    // who has arrived at their spot glancing around/gesturing reads the
    // same as one explicitly marked "idle".
    const settled = !!target && velRef.current < 0.3;
    // The action to fade back into after a gesture — whichever locomotion
    // action is actually playing (idle, or run/walk if settled mid-target-
    // mode), not hardcoded to "idle".
    const baseAction = actions[animation] ?? customActions.current[animation];
    if ((animation === "idle" || settled) && baseAction && actions.agree && actions.headShake) {
      const g = gestureRef.current;
      const t = clock.getElapsedTime();
      if (g.phase === "idle" && t > g.nextAt) {
        const name = seededRandom(t + seedRef.current) > 0.5 ? "agree" : "headShake";
        const gesture = actions[name]!;
        gesture.reset();
        gesture.setLoop(THREE.LoopOnce, 1);
        gesture.clampWhenFinished = true;
        gesture.fadeIn(0.3).play();
        baseAction.fadeOut(0.3);
        g.phase = "gesture";
        g.active = gesture;
        g.endAt = t + gesture.getClip().duration;
      } else if (g.phase === "gesture" && t > g.endAt) {
        g.active?.fadeOut(0.3);
        baseAction.reset().fadeIn(0.3).play();
        g.phase = "idle";
        g.active = null;
        g.nextAt = t + 5 + seededRandom(t) * 8;
      }
    }

    if (target) {
      const cur = group.current.position;
      const dx = target.x - cur.x;
      const dz = target.z - cur.z;
      const dist = Math.hypot(dx, dz);
      const maxSpeed = target.maxSpeed ?? 2.4;
      // Accelerate/decelerate toward the desired speed instead of snapping
      // to it — real momentum, the direct fix for "0 to top speed
      // instantly." Desired speed drops to 0 once close enough to arrive
      // smoothly rather than overshooting and correcting.
      const desired = dist > 0.15 ? maxSpeed : 0;
      const diff = desired - velRef.current;
      velRef.current = Math.max(0, velRef.current + Math.sign(diff) * Math.min(Math.abs(diff), ACCEL * delta));
      if (dist > 0.02 && velRef.current > 0.01) {
        const step = Math.min(velRef.current * delta, dist);
        cur.x += (dx / dist) * step;
        cur.z += (dz / dist) * step;
        if (target.facingY === undefined) group.current.rotation.y = Math.atan2(dx, dz);
      }
      if (target.facingY !== undefined) group.current.rotation.y = target.facingY;
      // Stride-speed sync: the baked run clip's stride cadence now matches
      // how fast the player is actually covering ground, instead of a
      // fixed multiplier decoupled from real movement — the buildable fix
      // for visible foot-sliding (true foot-IK isn't available on this
      // rig, see the plan's Context).
      const locomotionAction = actions[animation];
      if (locomotionAction && (animation === "run" || animation === "walk")) {
        const scale = THREE.MathUtils.clamp(velRef.current / RUN_REF_SPEED, 0.35, 1.6);
        locomotionAction.setEffectiveTimeScale(scale);
      }
      return;
    }

    if (orbit) {
      const t = clock.getElapsedTime() * orbit.speed + orbit.offset;
      const zScale = orbit.zScale ?? 0.55;
      const x = Math.cos(t) * orbit.radius;
      const z = Math.sin(t) * orbit.radius * zScale;
      group.current.position.set(x, orbit.y ?? 0, z);
      // Face the direction of travel: derivative of the parametric orbit path.
      const vx = -Math.sin(t) * orbit.radius;
      const vz = Math.cos(t) * orbit.radius * zScale;
      group.current.rotation.y = Math.atan2(vx, vz);
      return;
    }

    if (sway) {
      const t = clock.getElapsedTime() * sway.speed + sway.offset;
      const swayDelta = Math.sin(t) * sway.amplitude;
      const [bx, by, bz] = sway.base;
      if (sway.axis === "x") group.current.position.set(bx + swayDelta, by, bz);
      else group.current.position.set(bx, by, bz + swayDelta);
      group.current.rotation.y = sway.facingY;
    }
  });

  // xbot.glb is authored at real-world scale (its own bounding box is
  // 1.81 units tall — confirmed by reading the glb directly), so scale=1
  // now means "a real person," not an arbitrary shrink factor like the
  // 0.5-0.55 every scene used before the real-meter rebuild. +/-5% seeded
  // per-instance variance reads as natural human height variety instead of
  // every player being identically tall.
  const heightJitter = 0.95 + seededRandom(seedRef.current + 3) * 0.1;

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={scale * heightJitter}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
