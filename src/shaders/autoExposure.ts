import { BloomEffect, Effect, BlendFunction } from 'postprocessing';
import { Uniform } from 'three';

import { setDOMContent } from '@/core/utils';

// All-in-one: center-weighted avg luminance + exposure + Reinhard + gamma
// Average is computed per-pixel (same result for all pixels, 64 texture reads)
const mainFrag = `
uniform float target;
uniform float bloomThreshold;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Center-weighted average luminance (8x8 grid)
  float logSum = 0.0;
  float totalWeight = 0.0;
  const float G = 8.0;
  for (float y = 0.5; y < G; y += 1.0) {
    for (float x = 0.5; x < G; x += 1.0) {
      vec2 sampleUV = vec2(x, y) / G;
      float w = max(1.0 - length(sampleUV - 0.5) * 1.5, 0.05);
      logSum += log(max(luma(texture2D(inputBuffer, sampleUV).rgb), 0.0001)) * w;
      totalWeight += w;
    }
  }
  float avgLum = max(exp(logSum / totalWeight), 0.0001);

  // Exposure coefficient
  float ec = target / avgLum;
  vec3 color = inputColor.rgb * ec;

  // Reinhard tonemapping
  color = color / (1.0 + color);

  // Gamma (linear -> sRGB)
  color = pow(color, vec3(1.0 / 2.2));

  // Dithering: breaks 8-bit quantization banding in dark regions
  float noise = fract(sin(dot(uv * 1000.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  color += noise / 255.0;

  outputColor = vec4(color, inputColor.a);
}
`;

export class AutoExposureEffect extends Effect {
  private bloomRef: BloomEffect | null = null;

  // Tunable (from Leva)
  target = 0.18;
  bloomThreshold = 10.0;

  constructor() {
    super('AutoExposureEffect', mainFrag, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>([
        ['target', new Uniform(0.18)],
        ['bloomThreshold', new Uniform(10.0)],
      ]),
    });
  }

  linkBloom(bloom: BloomEffect | null) {
    this.bloomRef = bloom;
  }

  update() {
    this.uniforms.get('target')!.value = this.target;

    if (this.bloomRef) {
      this.bloomRef.luminanceMaterial.threshold = this.bloomThreshold;
    }
  }

  updateHUD() {
    setDOMContent('hud-exposure', `target: ${this.target.toFixed(3)}`);
  }
}
