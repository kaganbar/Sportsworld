"use client";

import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";

// Reference/preview only — not wired into any route. The scene URL below is
// a generic public Spline demo asset, not SportsWorld content; swap for a
// real scene (or drop this component) once there's a decided place to use
// it — see the integration notes for why this wasn't wired in automatically.
export function SplineSceneBasic() {
  return (
    <Card className="relative h-[500px] w-full overflow-hidden bg-black/[0.96]">
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" />

      <div className="flex h-full">
        <div className="relative z-10 flex flex-1 flex-col justify-center p-8">
          <h1 className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Interactive 3D
          </h1>
          <p className="mt-4 max-w-lg text-neutral-300">
            Bring your UI to life with beautiful 3D scenes. Create immersive experiences that capture attention and
            enhance your design.
          </p>
        </div>

        <div className="relative flex-1">
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
        </div>
      </div>
    </Card>
  );
}
