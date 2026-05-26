uniform float targetNight;
uniform float targetDay;
uniform float targetGlare;
uniform float minLum;
uniform float midLum;
uniform float maxLum;

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
  float adapted = max(exp(logSum / totalWeight), 0.0001);

  // Three-zone target: night → day → glare
  // adapted:  minLum ──── midLum ──── maxLum
  // target:   night  ──── day    ──── glare
  float logA = log(adapted);
  float t1 = smoothstep(log(minLum), log(midLum), logA);
  float t2 = smoothstep(log(midLum), log(maxLum), logA);
  float target = mix(mix(targetNight, targetDay, t1), targetGlare, t2);

  // Exposure coefficient
  float ec = target / adapted;
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
