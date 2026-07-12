"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

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

// A football kick: right leg winds up, swings through contact, follows
// through; torso counter-leans, arms fling out for balance.
const kickClip = new THREE.AnimationClip("kick", 0.6, [
  quatTrack(`${B}RightUpLeg`, [0, 0.2, 0.35, 0.6], [[0.3, 0, 0], [-0.6, 0, 0], [-0.9, 0, 0], [0, 0, 0]]),
  quatTrack(`${B}RightLeg`, [0, 0.2, 0.35, 0.6], [[0.2, 0, 0], [-0.1, 0, 0], [0, 0, 0], [0.1, 0, 0]]),
  quatTrack(`${B}Spine`, [0, 0.35, 0.6], [[-0.05, 0, 0], [0.15, 0, 0], [0, 0, 0]]),
  quatTrack(`${B}LeftArm`, [0, 0.35, 0.6], [[0, 0, -0.2], [0, 0, -0.5], [0, 0, -0.2]]),
  quatTrack(`${B}RightArm`, [0, 0.35, 0.6], [[0, 0, 0.2], [0, 0, 0.5], [0, 0, 0.2]]),
]);

// A basketball jump shot: crouch, extend upward, arms rise to a release
// point overhead, follow-through.
const shootClip = new THREE.AnimationClip("shoot", 0.7, [
  quatTrack(`${B}LeftUpLeg`, [0, 0.3, 0.7], [[0.3, 0, 0], [0, 0, 0], [0.25, 0, 0]]),
  quatTrack(`${B}RightUpLeg`, [0, 0.3, 0.7], [[0.3, 0, 0], [0, 0, 0], [0.25, 0, 0]]),
  quatTrack(`${B}LeftArm`, [0, 0.4, 0.7], [[0, 0, -0.3], [0, 0, -1.6], [0, 0, -1.2]]),
  quatTrack(`${B}RightArm`, [0, 0.4, 0.7], [[0, 0, 0.3], [0, 0, 1.6], [0, 0, 1.2]]),
  quatTrack(`${B}LeftForeArm`, [0, 0.4, 0.7], [[0, -1.1, 0], [0, -0.2, 0], [0, -0.4, 0]]),
  quatTrack(`${B}RightForeArm`, [0, 0.4, 0.7], [[0, 1.1, 0], [0, 0.2, 0], [0, 0.4, 0]]),
  quatTrack(`${B}Spine`, [0, 0.4, 0.7], [[0.1, 0, 0], [-0.1, 0, 0], [0, 0, 0]]),
]);

// A goalkeeper-style lateral dive: torso and hips roll to one side, arm
// reaches out, held down briefly before recovery.
const diveClip = new THREE.AnimationClip("dive", 0.8, [
  quatTrack(`${B}Spine`, [0, 0.35, 0.6, 0.8], [[0, 0, 0], [0.2, 0, 0.7], [0.3, 0, 0.9], [0.2, 0, 0.6]]),
  quatTrack(`${B}Spine1`, [0, 0.35, 0.6, 0.8], [[0, 0, 0], [0.1, 0, 0.4], [0.15, 0, 0.5], [0.1, 0, 0.35]]),
  quatTrack(`${B}RightArm`, [0, 0.3, 0.6, 0.8], [[0, 0, 0.3], [0, 0.2, 1.2], [0, 0.3, 1.4], [0, 0.2, 1.1]]),
  quatTrack(`${B}Hips`, [0, 0.35, 0.8], [[0, 0, 0], [0, 0.3, 0.3], [0, 0.25, 0.25]]),
  quatTrack(`${B}RightUpLeg`, [0, 0.3, 0.8], [[0, 0, 0], [-0.4, 0, 0.3], [-0.2, 0, 0.2]]),
]);

// A tennis forehand swing: arm winds up behind the body, sweeps through
// contact, follows through across the torso; spine rotates through the hit.
const swingClip = new THREE.AnimationClip("swing", 0.6, [
  quatTrack(`${B}RightArm`, [0, 0.25, 0.6], [[0.2, -0.6, -1.3], [-0.2, 0.5, 0.9], [-0.4, 1.0, 1.5]]),
  quatTrack(`${B}RightForeArm`, [0, 0.25, 0.6], [[0, 0, -0.9], [0, 0, -0.1], [0, 0, -0.4]]),
  quatTrack(`${B}Spine`, [0, 0.25, 0.6], [[0, -0.5, 0], [0, 0.4, 0], [0, 0.6, 0]]),
  quatTrack(`${B}LeftArm`, [0, 0.25, 0.6], [[0, 0, -0.3], [0, 0, -0.8], [0, 0, -0.6]]),
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

interface PlayerProps {
  color: string;
  animation?: PlayerAnimation;
  speed?: number;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  orbit?: OrbitPath;
  sway?: SwayPath;
}

export default function Player({
  color,
  animation = "run",
  speed = 1,
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  orbit,
  sway,
}: PlayerProps) {
  const { scene, animations } = useGLTF(MODEL_URL);
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, group);
  // Hand-authored sport-action clips aren't part of the loaded GLTF, so
  // `actions` (built by useAnimations from `animations`) doesn't know about
  // them — registered directly on the same mixer instead, once per mount.
  const customActions = useRef<Partial<Record<PlayerAnimation, THREE.AnimationAction>>>({});

  useEffect(() => {
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const material = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mesh.isMesh && material && "color" in material) {
        mesh.material = material.clone();
        (mesh.material as THREE.MeshStandardMaterial).color.set(color);
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
    action?.reset().fadeIn(0.2).setEffectiveTimeScale(speed).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, animation, speed]);

  useFrame(({ clock }) => {
    if (!group.current) return;

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
      const delta = Math.sin(t) * sway.amplitude;
      const [bx, by, bz] = sway.base;
      if (sway.axis === "x") group.current.position.set(bx + delta, by, bz);
      else group.current.position.set(bx, by, bz + delta);
      group.current.rotation.y = sway.facingY;
    }
  });

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
