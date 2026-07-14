import {
  Color,
  HalfFloatType,
  MeshDepthMaterial,
  NearestFilter,
  NoBlending,
  RGBADepthPacking,
  ShaderMaterial,
  Texture,
  UniformsUtils,
  WebGLRenderTarget,
} from "three";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

type Uniform<T> = { value: T };
interface AlphaSafeBokehUniforms {
  [key: string]: Uniform<unknown>;
  tColor: Uniform<Texture | null>;
  tDepth: Uniform<Texture | null>;
  focus: Uniform<number>;
  aspect: Uniform<number>;
  aperture: Uniform<number>;
  maxblur: Uniform<number>;
  nearClip: Uniform<number>;
  farClip: Uniform<number>;
}

// A local fork of three's own bundled BokehPass.js + BokehShader.js (MIT-
// licensed, same license as the rest of three's examples this project
// already vendors via Effects.tsx). The ONLY change from the stock
// version: the composite fragment shader's final line hardcodes
// `gl_FragColor.a = 1.0` — confirmed by reading the original source —
// which would force every pixel fully opaque, including empty "sky"
// regions that are supposed to stay transparent so the CSS gradient shows
// through behind them (the same alpha-corruption bug this project already
// found and avoided in UnrealBloomPass, documented in Effects.tsx). Here
// it's changed to sample the un-blurred base render's own alpha at that
// pixel instead, preserving the "is there real geometry here" signal the
// rest of this alpha-safe composite chain depends on. Everything else —
// the depth pre-pass, the 41-tap bokeh blur — is Martins Upitis's original
// algorithm, unmodified.
const AlphaSafeBokehShader = {
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    focus: { value: 1.0 },
    aspect: { value: 1.0 },
    aperture: { value: 0.025 },
    maxblur: { value: 0.01 },
    nearClip: { value: 1.0 },
    farClip: { value: 1000.0 },
  } as AlphaSafeBokehUniforms,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    #include <common>
    varying vec2 vUv;
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform float maxblur;
    uniform float aperture;
    uniform float nearClip;
    uniform float farClip;
    uniform float focus;
    uniform float aspect;
    #include <packing>

    float getDepth( const in vec2 screenPosition ) {
      return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
    }
    float getViewZ( const in float depth ) {
      return perspectiveDepthToViewZ( depth, nearClip, farClip );
    }

    void main() {
      vec2 aspectcorrect = vec2( 1.0, aspect );
      float viewZ = getViewZ( getDepth( vUv ) );
      float factor = ( focus + viewZ );
      vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );
      vec2 dofblur9 = dofblur * 0.9;
      vec2 dofblur7 = dofblur * 0.7;
      vec2 dofblur4 = dofblur * 0.4;

      vec4 col = vec4( 0.0 );
      col += texture2D( tColor, vUv.xy );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

      col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );

      col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );

      col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
      col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
      col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );

      gl_FragColor = col / 41.0;
      // The one change from stock BokehShader: preserve the base render's
      // own alpha instead of hardcoding 1.0, so empty sky stays
      // transparent through this pass instead of turning solid.
      gl_FragColor.a = texture2D( tColor, vUv ).a;
    }`,
};

export class AlphaSafeBokehPass extends Pass {
  scene: THREE_Scene;
  camera: THREE_PerspectiveCamera;
  renderTargetDepth: WebGLRenderTarget;
  materialDepth: MeshDepthMaterial;
  materialBokeh: ShaderMaterial;
  uniforms: typeof AlphaSafeBokehShader.uniforms;
  fsQuad: FullScreenQuad;
  private _oldClearColor: Color;

  constructor(scene: THREE_Scene, camera: THREE_PerspectiveCamera, params: { focus?: number; aperture?: number; maxblur?: number }) {
    super();

    this.scene = scene;
    this.camera = camera;

    const focus = params.focus !== undefined ? params.focus : 1.0;
    const aperture = params.aperture !== undefined ? params.aperture : 0.025;
    const maxblur = params.maxblur !== undefined ? params.maxblur : 1.0;

    this.renderTargetDepth = new WebGLRenderTarget(1, 1, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      type: HalfFloatType,
    });
    this.renderTargetDepth.texture.name = "AlphaSafeBokehPass.depth";

    this.materialDepth = new MeshDepthMaterial();
    this.materialDepth.depthPacking = RGBADepthPacking;
    this.materialDepth.blending = NoBlending;

    const bokehUniforms = UniformsUtils.clone(AlphaSafeBokehShader.uniforms) as AlphaSafeBokehUniforms;
    bokehUniforms.tDepth.value = this.renderTargetDepth.texture;
    bokehUniforms.focus.value = focus;
    bokehUniforms.aspect.value = camera.aspect ?? 1;
    bokehUniforms.aperture.value = aperture;
    bokehUniforms.maxblur.value = maxblur;
    bokehUniforms.nearClip.value = camera.near;
    bokehUniforms.farClip.value = camera.far;

    this.materialBokeh = new ShaderMaterial({
      uniforms: bokehUniforms,
      vertexShader: AlphaSafeBokehShader.vertexShader,
      fragmentShader: AlphaSafeBokehShader.fragmentShader,
    });

    this.uniforms = bokehUniforms;
    this.fsQuad = new FullScreenQuad(this.materialBokeh);
    this._oldClearColor = new Color();
  }

  render(renderer: THREE_WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
    this.scene.overrideMaterial = this.materialDepth;

    renderer.getClearColor(this._oldClearColor);
    const oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    renderer.setClearColor(0xffffff);
    renderer.setClearAlpha(1.0);
    renderer.setRenderTarget(this.renderTargetDepth);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.uniforms.tColor.value = readBuffer.texture;
    this.uniforms.nearClip.value = this.camera.near;
    this.uniforms.farClip.value = this.camera.far;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      renderer.clear();
      this.fsQuad.render(renderer);
    }

    this.scene.overrideMaterial = null;
    renderer.setClearColor(this._oldClearColor);
    renderer.setClearAlpha(oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }

  setSize(width: number, height: number) {
    this.materialBokeh.uniforms.aspect.value = width / height;
    this.renderTargetDepth.setSize(width, height);
  }

  dispose() {
    this.renderTargetDepth.dispose();
    this.materialDepth.dispose();
    this.materialBokeh.dispose();
    this.fsQuad.dispose();
  }
}

// Minimal local type aliases — avoids importing THREE's full namespace just
// for constructor parameter types in this file.
type THREE_Scene = import("three").Scene;
type THREE_Camera = import("three").Camera;
type THREE_PerspectiveCamera = import("three").PerspectiveCamera;
type THREE_WebGLRenderer = import("three").WebGLRenderer;
