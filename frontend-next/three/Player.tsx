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

export type PlayerAnimation = "idle" | "walk" | "run";

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
  const { actions } = useAnimations(animations, group);

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
    const action = actions[animation];
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
