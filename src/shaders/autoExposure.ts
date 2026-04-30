import { Effect, BlendFunction } from 'postprocessing';
import {
  Clock,
  FloatType,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Uniform,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

import { setDOMContent } from '@/core/utils';

const quadVert = `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// 1. Adaptation: 8x8 grid avg luminance + temporal smoothing (1x1 ping-pong)
const adaptFrag = `
uniform sampler2D inputBuffer;
uniform sampler2D prevAdaptTex;
uniform float deltaTime;
uniform float tauLight;
uniform float tauDark;
uniform float minLum;
uniform float maxLum;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  float logSum = 0.0;
  const float G = 8.0;
  for (float y = 0.5; y < G; y += 1.0)
    for (float x = 0.5; x < G; x += 1.0)
      logSum += log(max(luma(texture2D(inputBuffer, vec2(x, y) / G).rgb), 0.0001));
  float avg = clamp(exp(logSum / (G * G)), minLum, maxLum);
  float prev = texture2D(prevAdaptTex, vec2(0.5)).r;
  if (prev < 0.00001) { gl_FragColor = vec4(avg, 0.0, 0.0, 1.0); return; }
  float tau = avg > prev ? tauLight : tauDark;
  float adapted = prev + (avg - prev) * (1.0 - exp(-deltaTime / tau));
  gl_FragColor = vec4(clamp(adapted, minLum, maxLum), 0.0, 0.0, 1.0);
}
`;

// 2. Bloom downsample: 4-tap bilinear + bright-pass (first level only)
const downFrag = `
varying vec2 vUv;
uniform sampler2D srcTex;
uniform vec2 srcTexelSize;
uniform float threshold;
uniform float exposureCoeff;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  vec3 c = vec3(0.0);
  c += texture2D(srcTex, vUv + vec2(-0.5, -0.5) * srcTexelSize).rgb;
  c += texture2D(srcTex, vUv + vec2( 0.5, -0.5) * srcTexelSize).rgb;
  c += texture2D(srcTex, vUv + vec2(-0.5,  0.5) * srcTexelSize).rgb;
  c += texture2D(srcTex, vUv + vec2( 0.5,  0.5) * srcTexelSize).rgb;
  c *= 0.25 * exposureCoeff;
  if (threshold > 0.0) c *= smoothstep(threshold * 0.8, threshold * 1.2, luma(c));
  gl_FragColor = vec4(c, 1.0);
}
`;

// 3. Bloom upsample: 9-tap tent filter + additive blend with current level
const upFrag = `
varying vec2 vUv;
uniform sampler2D lowerTex;
uniform sampler2D curTex;
uniform vec2 lowerTexelSize;

void main() {
  vec3 b = vec3(0.0);
  b += texture2D(lowerTex, vUv + vec2(-1,-1) * lowerTexelSize).rgb;
  b += texture2D(lowerTex, vUv + vec2( 0,-1) * lowerTexelSize).rgb * 2.0;
  b += texture2D(lowerTex, vUv + vec2( 1,-1) * lowerTexelSize).rgb;
  b += texture2D(lowerTex, vUv + vec2(-1, 0) * lowerTexelSize).rgb * 2.0;
  b += texture2D(lowerTex, vUv                                ).rgb * 4.0;
  b += texture2D(lowerTex, vUv + vec2( 1, 0) * lowerTexelSize).rgb * 2.0;
  b += texture2D(lowerTex, vUv + vec2(-1, 1) * lowerTexelSize).rgb;
  b += texture2D(lowerTex, vUv + vec2( 0, 1) * lowerTexelSize).rgb * 2.0;
  b += texture2D(lowerTex, vUv + vec2( 1, 1) * lowerTexelSize).rgb;
  b /= 16.0;
  gl_FragColor = vec4(texture2D(curTex, vUv).rgb + b, 1.0);
}
`;

// 4. Main: exposure + bloom composite + Reinhard + Purkinje + gamma
const mainFrag = `
uniform sampler2D adaptTex;
uniform sampler2D bloomTex;
uniform float bloomIntensity;
uniform float targetDay;
uniform float targetNight;
uniform bool useBlueDark;
uniform float minLum;
uniform float maxLum;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float adapted = max(texture2D(adaptTex, vec2(0.5)).r, 0.0001);
  float t = smoothstep(log(minLum), log(maxLum), log(adapted));
  float target = mix(targetNight, targetDay, t);
  float ec = target / adapted;

  vec3 color = inputColor.rgb * ec;
  vec3 bloom = texture2D(bloomTex, uv).rgb * bloomIntensity;
  color += bloom;

  vec3 day = color / (1.0 + color);
  float grey = dot(day, vec3(0.299, 0.587, 0.114));
  vec3 night = useBlueDark ? vec3(grey) * vec3(0.8, 0.9, 1.2) : vec3(grey);
  color = mix(night, day, t);
  color = pow(color, vec3(1.0 / 2.2));
  outputColor = vec4(color, inputColor.a);
}
`;

const BLOOM_LEVELS = 5;

export class AutoExposureEffect extends Effect {
  private adaptTargets: [WebGLRenderTarget, WebGLRenderTarget];
  private adaptIdx = 0;
  private bloomTargets: WebGLRenderTarget[] = [];
  private adaptMat: ShaderMaterial;
  private downMat: ShaderMaterial;
  private upMat: ShaderMaterial;
  private scene: Scene;
  private cam: OrthographicCamera;
  private quad: Mesh;
  private clock = new Clock();
  private readbackBuf = new Float32Array(4);
  private lastW = 0;
  private lastH = 0;

  currentAdaptedLuminance = 1.0;

  // Tunable (from Leva)
  targetDay = 0.2;
  targetNight = 0.05;
  minLum = 0.001;
  maxLum = 100;
  tauLight = 0.2;
  tauDark = 3;
  useBlueDark = true;
  bloomThreshold = 1.0;
  bloomIntensity = 0.8;

  constructor() {
    super('AutoExposureEffect', mainFrag, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['adaptTex', new Uniform(null)],
        ['bloomTex', new Uniform(null)],
        ['bloomIntensity', new Uniform(0.8)],
        ['targetDay', new Uniform(0.2)],
        ['targetNight', new Uniform(0.05)],
        ['useBlueDark', new Uniform(true)],
        ['minLum', new Uniform(0.001)],
        ['maxLum', new Uniform(100)],
      ]),
    });

    const rt1x1 = { type: FloatType, minFilter: NearestFilter, magFilter: NearestFilter };
    this.adaptTargets = [new WebGLRenderTarget(1, 1, rt1x1), new WebGLRenderTarget(1, 1, rt1x1)];

    this.adaptMat = new ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: adaptFrag,
      uniforms: {
        inputBuffer: { value: null },
        prevAdaptTex: { value: null },
        deltaTime: { value: 0 },
        tauLight: { value: 0.2 },
        tauDark: { value: 3 },
        minLum: { value: 0.001 },
        maxLum: { value: 100 },
      },
    });
    this.downMat = new ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: downFrag,
      uniforms: { srcTex: { value: null }, srcTexelSize: { value: new Vector2() }, threshold: { value: 1 }, exposureCoeff: { value: 1 } },
    });
    this.upMat = new ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: upFrag,
      uniforms: { lowerTex: { value: null }, curTex: { value: null }, lowerTexelSize: { value: new Vector2() } },
    });

    this.scene = new Scene();
    this.cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.adaptMat);
    this.scene.add(this.quad);
  }

  private ensureBloomTargets(w: number, h: number) {
    if (this.lastW === w && this.lastH === h) {
      return;
    }
    this.bloomTargets.forEach((t) => t.dispose());
    this.bloomTargets = [];
    const opts = { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter };
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      w = Math.max(1, Math.floor(w / 2));
      h = Math.max(1, Math.floor(h / 2));
      this.bloomTargets.push(new WebGLRenderTarget(w, h, opts));
    }
    this.lastW = w;
    this.lastH = h;
  }

  private renderQuad(renderer: WebGLRenderer, mat: ShaderMaterial, target: WebGLRenderTarget) {
    this.quad.material = mat;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.cam);
    renderer.setRenderTarget(prev);
  }

  update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget) {
    const dt = this.clock.getDelta() || 0.016;

    // --- Adaptation ---
    const prevAdapt = this.adaptTargets[this.adaptIdx];
    const nextAdapt = this.adaptTargets[1 - this.adaptIdx];
    const au = this.adaptMat.uniforms;
    au.inputBuffer.value = inputBuffer.texture;
    au.prevAdaptTex.value = prevAdapt.texture;
    au.deltaTime.value = dt;
    au.tauLight.value = this.tauLight;
    au.tauDark.value = this.tauDark;
    au.minLum.value = this.minLum;
    au.maxLum.value = this.maxLum;
    this.renderQuad(renderer, this.adaptMat, nextAdapt);
    this.adaptIdx = 1 - this.adaptIdx;

    // Readback for debug + bloom exposure
    renderer.readRenderTargetPixels(nextAdapt, 0, 0, 1, 1, this.readbackBuf);
    this.currentAdaptedLuminance = this.readbackBuf[0] || 1.0;
    const logRange = Math.log(this.maxLum) - Math.log(this.minLum);
    const t = Math.max(0, Math.min(1, (Math.log(this.currentAdaptedLuminance) - Math.log(this.minLum)) / logRange));
    const target = this.targetNight + (this.targetDay - this.targetNight) * t;
    const ec = target / Math.max(this.currentAdaptedLuminance, 0.001);

    // --- Bloom downsample ---
    this.ensureBloomTargets(inputBuffer.width, inputBuffer.height);
    const du = this.downMat.uniforms;
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      const src = i === 0 ? inputBuffer : this.bloomTargets[i - 1];
      du.srcTex.value = src.texture;
      du.srcTexelSize.value.set(1 / src.width, 1 / src.height);
      du.threshold.value = i === 0 ? this.bloomThreshold : 0;
      du.exposureCoeff.value = i === 0 ? ec : 1;
      this.renderQuad(renderer, this.downMat, this.bloomTargets[i]);
    }

    // --- Bloom upsample ---
    const uu = this.upMat.uniforms;
    for (let i = BLOOM_LEVELS - 2; i >= 0; i--) {
      const lower = this.bloomTargets[i + 1];
      uu.lowerTex.value = lower.texture;
      uu.curTex.value = this.bloomTargets[i].texture;
      uu.lowerTexelSize.value.set(1 / lower.width, 1 / lower.height);
      this.renderQuad(renderer, this.upMat, this.bloomTargets[i]);
    }

    // --- Pass to main shader ---
    this.uniforms.get('adaptTex')!.value = nextAdapt.texture;
    this.uniforms.get('bloomTex')!.value = this.bloomTargets[0].texture;
    this.uniforms.get('bloomIntensity')!.value = this.bloomIntensity;
    this.uniforms.get('targetDay')!.value = this.targetDay;
    this.uniforms.get('targetNight')!.value = this.targetNight;
    this.uniforms.get('useBlueDark')!.value = this.useBlueDark;
    this.uniforms.get('minLum')!.value = this.minLum;
    this.uniforms.get('maxLum')!.value = this.maxLum;
  }

  updateHUD() {
    setDOMContent('hud-exposure', `Exposure: ${this.currentAdaptedLuminance.toFixed(4)}`);
  }

  dispose() {
    this.adaptTargets.forEach((t) => t.dispose());
    this.bloomTargets.forEach((t) => t.dispose());
    this.adaptMat.dispose();
    this.downMat.dispose();
    this.upMat.dispose();
    super.dispose();
  }
}
