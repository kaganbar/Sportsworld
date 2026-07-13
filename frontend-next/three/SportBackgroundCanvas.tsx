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
    // fixed, not absolute: this must stay pinned to the viewport regardless
    // of how tall the scrollable page content grows (a long fixture list
    // makes ThemeLayout's wrapper much taller than one screen) — absolute
    // positioning stretched the canvas to that full scroll height, wrecking
    // the camera's aspect ratio and rendering mostly black. ThemeLayout's
    // own `relative z-0` still captures this for z-index stacking purposes;
    // position:fixed only changes what it's sized/pinned against.
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Canvas
        // @react-three/fiber sets its own inline pointer-events on the
        // actual <canvas> element, which otherwise overrides this wrapper
        // div's pointer-events-none class (a real bug hit while adding the
        // new sidebar: its collapse button became unclickable because the
        // canvas was silently capturing the click underneath it).
        style={{ pointerEvents: "none" }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
        camera={{ position: [0, 6, 8], fov: 50 }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0, 0);
          // Without this the WebGL clear color paints opaque black wherever
          // the scene has no geometry (sky/empty space around the pitch),
          // completely hiding the CSS gradient + scrim behind it instead of
          // blending with them — directly undermines "always darkened
          // behind the UI," never a solid black box.
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
