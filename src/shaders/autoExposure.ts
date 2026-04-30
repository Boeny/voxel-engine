import { Effect, BlendFunction } from 'postprocessing';
import {
  FloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Uniform,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

// GPU pass: computes log-average luminance from 8x8 grid, outputs to 1x1 target
const luminanceFragShader = `
uniform sampler2D inputBuffer;

float getLuminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  float logLumSum = 0.0;
  const float GRID = 8.0;

  for (float y = 0.5; y < GRID; y += 1.0) {
    for (float x = 0.5; x < GRID; x += 1.0) {
      vec3 s = texture2D(inputBuffer, vec2(x, y) / GRID).rgb;
      logLumSum += log(max(getLuminance(s), 0.0001));
    }
  }

  gl_FragColor = vec4(exp(logLumSum / (GRID * GRID)), 0.0, 0.0, 1.0);
}
`;

// Main effect: applies adapted exposure + Reinhard tonemapping
const mainFragShader = `
uniform float exposure;
uniform float targetDay;
uniform float targetNight;
uniform bool useBlueDark;
uniform float minAdaptLuminance;
uniform float maxAdaptLuminance;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Calculate target lightness
  float t = smoothstep(log(minAdaptLuminance), log(maxAdaptLuminance), log(exposure));
  float targetLuminance = mix(targetNight, targetDay, t);

  // Tone mapping: exposure coefficient
  float exposureCoeff = targetLuminance / exposure;

  vec3 color = inputColor.rgb * exposureCoeff;

  // Reinhard tonemapping (soft shoulder in highlights, tone compressing)
  vec3 dayLightness = color / (1.0 + color);

  // Purkinje effect in the dark (grey colors)
  float grey = dot(dayLightness, vec3(0.299, 0.587, 0.114));
  vec3 nightLightness = vec3(grey);

  if (useBlueDark) {
    nightLightness = nightLightness * vec3(0.8, 0.9, 1.2);
  }

  color = mix(nightLightness, dayLightness, t);

  // Gamma correction (linear → sRGB)
  color = pow(color, vec3(1.0 / 2.2));

  outputColor = vec4(color, inputColor.a);
}
`;

export class AutoExposureEffect extends Effect {
  private lumTarget: WebGLRenderTarget;
  private lumMaterial: ShaderMaterial;
  private lumScene: Scene;
  private lumCamera: OrthographicCamera;
  private lumPixel = new Float32Array(4);
  private adaptedLum = 1.0;

  // Tunable parameters
  targetDay: number;
  targetNight: number;
  minAdaptLuminance: number;
  maxAdaptLuminance: number;
  tauLight: number; // adaptation speed to brightness (fast, 0.5s)
  tauDark: number; // adaptation speed to darkness (slow, 2-3s)
  useBlueDark: boolean;

  constructor() {
    super('AutoExposureEffect', mainFragShader, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['exposure', new Uniform(1.0)],
        ['targetDay', new Uniform(0.2)],
        ['targetNight', new Uniform(0.05)],
        ['useBlueDark', new Uniform(true)],
        ['minAdaptLuminance', new Uniform(0.01)],
        ['maxAdaptLuminance', new Uniform(100)],
      ]),
    });

    this.targetDay = 0.2;
    this.targetNight = 0.05;
    this.minAdaptLuminance = 0.001;
    this.maxAdaptLuminance = 100;
    this.tauLight = 0.2;
    this.tauDark = 3;
    this.useBlueDark = true;

    // 1x1 render target for GPU luminance computation
    this.lumTarget = new WebGLRenderTarget(1, 1, { type: FloatType });

    this.lumMaterial = new ShaderMaterial({
      uniforms: { inputBuffer: { value: null } },
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: luminanceFragShader,
    });

    this.lumScene = new Scene();
    this.lumCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.lumScene.add(new Mesh(new PlaneGeometry(2, 2), this.lumMaterial));
  }

  update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, deltaTime?: number) {
    const dt = deltaTime ?? 0.016;

    // 1. GPU: compute average luminance → 1x1 target (only 1 pixel runs the 8x8 loop)
    this.lumMaterial.uniforms.inputBuffer.value = inputBuffer.texture;
    renderer.setRenderTarget(this.lumTarget);
    renderer.render(this.lumScene, this.lumCamera);
    renderer.setRenderTarget(null);

    // 2. Read back 1 pixel (minimal GPU stall)
    renderer.readRenderTargetPixels(this.lumTarget, 0, 0, 1, 1, this.lumPixel);

    let lumaAvg = Math.max(this.lumPixel[0], this.minAdaptLuminance);
    lumaAvg = Math.min(lumaAvg, this.maxAdaptLuminance);

    // 3. Exponential smoothing: fast adaptation to light, slow to dark (like the eye)
    const currentExposure = this.adaptedLum;
    const tau = lumaAvg > currentExposure ? this.tauLight : this.tauDark;

    // Exponential smooting: equivavlent physical eye inertion
    this.adaptedLum = currentExposure + (lumaAvg - currentExposure) * (1 - Math.exp(-dt / tau));
    this.adaptedLum = Math.max(this.minAdaptLuminance, Math.min(this.maxAdaptLuminance, this.adaptedLum));

    // 4. Send to main shader
    this.uniforms.get('exposure')!.value = this.adaptedLum;
    this.uniforms.get('targetDay')!.value = this.targetDay;
    this.uniforms.get('targetNight')!.value = this.targetNight;
    this.uniforms.get('useBlueDark')!.value = this.useBlueDark;
    this.uniforms.get('minAdaptLuminance')!.value = this.minAdaptLuminance;
    this.uniforms.get('maxAdaptLuminance')!.value = this.maxAdaptLuminance;
  }

  dispose() {
    this.lumTarget.dispose();
    this.lumMaterial.dispose();
    super.dispose();
  }
}
