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

// Default export so ThemeLayout can React.lazy()-import this whole module —
// that's the actual code-split boundary that keeps three.js/@react-three/fiber
// out of the main bundle until a themed sport page is visited.
export default function SportBackgroundCanvas({ sport }: { sport: SportKey }) {
  const Scene = scenes[sport];
  if (!Scene || !hasWebGL()) return null; // CSS gradient background shows through untouched

  return (
    <div className="sport-3d-bg">
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
