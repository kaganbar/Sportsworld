"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
import { AlphaSafeBokehPass } from "./passes/AlphaSafeBokehPass";
import type { PerspectiveCamera } from "three";

// A hand-rolled post-processing pass (vignette + correct color-space
// output) using three.js's own bundled EffectComposer/passes —
// @react-three/postprocessing isn't installed and can't be (npm registry
// access is blocked in this dev environment), so this wires the same
// EffectComposer the React wrapper would use, directly.
//
// Deliberately NOT using UnrealBloomPass here, despite it being the more
// obvious "premium glow" choice: its composite step draws an unconditional
// full-screen quad whose fragment shader hardcodes alpha to 1.0 (confirmed
// by reading three's source), which would silently force the canvas fully
// opaque everywhere — including the empty "sky" regions that are supposed
// to stay transparent so the CSS gradient shows through behind them. That
// exact "opaque sky" bug was hit and fixed twice already in this project;
// reintroducing it via bloom would be a real regression. VignetteShader and
// OutputPass both explicitly forward the source alpha channel (verified in
// their shaders), so this chain is alpha-safe end to end. The "glow" look
// instead comes from ACESFilmicToneMapping (set in SportBackgroundCanvas)
// plus boosted emissive intensities on the floodlights/glow materials —
// zero extra render passes, zero alpha risk.
//
// The one heavier pass in this chain is AlphaSafeBokehPass (three/passes/)
// — a local fork of three's bundled BokehPass with the same alpha bug the
// bloom pass had (confirmed by reading its source) fixed. It's the user's
// explicit choice of real per-pixel depth-of-field over a cheap CSS blur,
// accepting the added cost of a scene depth pre-pass + a 41-tap blur
// shader; tuned deliberately subtle (small aperture/maxblur) per the
// brief's own "very subtle... never fight the UI for attention" wording,
// and re-verified against the project's standing FPS check afterward.
const DOF_FOCUS = 26; // world units — a middle ground across each zone's docked camera distance (~18-30)
const DOF_APERTURE = 0.012; // small — a gentle background softening, not a heavy blur
const DOF_MAXBLUR = 0.006;

export default function Effects() {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    // Explicit clearAlpha=0 (not the default null, which would just reuse
    // whatever the renderer's current clear alpha happens to be) — belt
    // and suspenders for the same "transparent sky" requirement.
    c.addPass(new RenderPass(scene, camera, null, undefined, 0));

    // PersistentWorldCanvas always constructs a PerspectiveCamera (fov is
    // passed, no orthographic camera is ever used in this world) — the
    // cast just satisfies useThree()'s general Camera return type.
    const bokeh = new AlphaSafeBokehPass(scene, camera as PerspectiveCamera, {
      focus: DOF_FOCUS,
      aperture: DOF_APERTURE,
      maxblur: DOF_MAXBLUR,
    });
    c.addPass(bokeh);

    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 1.15;
    vignette.uniforms.darkness.value = 1.0;
    c.addPass(vignette);

    c.addPass(new OutputPass());
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- size handled by the resize effect below, not a composer-recreate dependency
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  useEffect(() => {
    return () => {
      composer.dispose();
    };
  }, [composer]);

  // Priority > 0 tells @react-three/fiber to skip its own default render
  // call for this frame and let this callback render instead — the
  // standard pattern for taking over rendering without
  // @react-three/postprocessing's <EffectComposer> wrapper.
  useFrame((_, delta) => {
    composer.render(delta);
  }, 1);

  return null;
}
