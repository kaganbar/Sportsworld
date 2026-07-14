import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Court/pitch markings (boundary lines, penalty boxes, service lines, etc.)
// were originally each their own <mesh> + <meshBasicMaterial> JSX element —
// simple to write, but every one is a separate draw call with its own
// material instance. Measured cost: football's 18-line marking set alone
// cost ~30fps (60 -> 30) versus basketball's 16-line set costing only
// ~2fps, isolated by disabling markings and re-measuring — confirmed via
// the project's standing FPS check, not guessed. The fix is baking each
// line/ring's position directly into its own geometry (translate/rotate at
// build time, not via a per-mesh transform) and merging all of them into
// ONE BufferGeometry — same visual result, one draw call instead of N.
export interface LineSpec {
  position: [number, number, number];
  size: [number, number];
}

export interface RingSpec {
  position: [number, number, number];
  inner: number;
  outer: number;
  segments?: number;
  thetaStart?: number;
  thetaLength?: number;
}

export function buildMarkingsGeometry(lines: LineSpec[], rings: RingSpec[] = []): THREE.BufferGeometry {
  const geoms: THREE.BufferGeometry[] = [];
  for (const l of lines) {
    const g = new THREE.PlaneGeometry(l.size[0], l.size[1]);
    g.rotateX(-Math.PI / 2);
    g.translate(l.position[0], l.position[1], l.position[2]);
    geoms.push(g);
  }
  for (const r of rings) {
    const g = new THREE.RingGeometry(r.inner, r.outer, r.segments ?? 32, 1, r.thetaStart ?? 0, r.thetaLength ?? Math.PI * 2);
    g.rotateX(-Math.PI / 2);
    g.translate(r.position[0], r.position[1], r.position[2]);
    geoms.push(g);
  }
  const merged = mergeGeometries(geoms, false);
  geoms.forEach((g) => g.dispose());
  return merged;
}
