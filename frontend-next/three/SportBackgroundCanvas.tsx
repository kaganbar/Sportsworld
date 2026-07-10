"use client";

import { Canvas } from "@react-three/fiber";

import { SportKey } from "../theme/sportsTheme";
import { scenes } from "./scenes";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

// Imported via next/dynamic({ ssr: false }) from ThemeLayout — that's the
// actual "never touches the server render" boundary in Next.js (unlike
// React.lazy+Suspense on their own, which still participate in SSR and would
// crash here since hasWebGL() touches `document` at call time). It's also
// still the code-split boundary that keeps three.js/@react-three/fiber out
// of the main bundle until a themed sport page actually renders.
export default function SportBackgroundCanvas({ sport }: { sport: SportKey }) {
  const Scene = scenes[sport];
  if (!Scene || !hasWebGL()) return null; // CSS gradient background shows through untouched

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "low-power" }}
        camera={{ position: [0, 6, 8], fov: 50 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
