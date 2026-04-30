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
uniform float adaptedLuminance;
uniform float targetLuminance;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float exposureCoeff = targetLuminance / max(adaptedLuminance, 0.001);
    vec3 color = inputColor.rgb * exposureCoeff;

    // Reinhard tonemapping (soft shoulder in highlights)
    color = color / (1.0 + color);

    // Gamma correction (linear → sRGB)
    color = pow(color, vec3(1.0 / 2.2));

    outputColor = vec4(color, inputColor.a);
}
`;

interface AutoExposureOptions {
  targetLuminance?: number;
  minAdaptLuminance?: number;
  maxAdaptLuminance?: number;
  tauLight?: number;
  tauDark?: number;
}

export class AutoExposureEffect extends Effect {
  private lumTarget: WebGLRenderTarget;
  private lumMaterial: ShaderMaterial;
  private lumScene: Scene;
  private lumCamera: OrthographicCamera;
  private lumPixel = new Float32Array(4);
  private adaptedLum = 1.0;

  // Tunable parameters
  targetLuminance: number;
  minAdaptLuminance: number;
  maxAdaptLuminance: number;
  tauLight: number; // adaptation speed to brightness (fast, ~0.5s)
  tauDark: number; // adaptation speed to darkness (slow, ~2.0s)

  constructor({
    targetLuminance = 0.18,
    minAdaptLuminance = 0.001,
    maxAdaptLuminance = 100.0,
    tauLight = 0.5,
    tauDark = 2.0,
  }: AutoExposureOptions = {}) {
    super('AutoExposureEffect', mainFragShader, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['adaptedLuminance', new Uniform(1.0)],
        ['targetLuminance', new Uniform(targetLuminance)],
      ]),
    });

    this.targetLuminance = targetLuminance;
    this.minAdaptLuminance = minAdaptLuminance;
    this.maxAdaptLuminance = maxAdaptLuminance;
    this.tauLight = tauLight;
    this.tauDark = tauDark;

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
    const avgLum = Math.max(this.lumPixel[0], this.minAdaptLuminance);
    const clampedLum = Math.min(avgLum, this.maxAdaptLuminance);

    // 3. Exponential smoothing: fast adaptation to light, slow to dark (like the eye)
    const tau = clampedLum > this.adaptedLum ? this.tauLight : this.tauDark;
    this.adaptedLum += (clampedLum - this.adaptedLum) * (1 - Math.exp(-dt / tau));
    this.adaptedLum = Math.max(this.minAdaptLuminance, Math.min(this.maxAdaptLuminance, this.adaptedLum));

    // 4. Send to main shader
    this.uniforms.get('adaptedLuminance')!.value = this.adaptedLum;
    this.uniforms.get('targetLuminance')!.value = this.targetLuminance;
  }

  dispose() {
    this.lumTarget.dispose();
    this.lumMaterial.dispose();
    super.dispose();
  }
}
