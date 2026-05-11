/* eslint-disable @typescript-eslint/no-unused-vars */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Object3D, Points, ShaderMaterial, Vector3 } from 'three';

import starsData from '@/data/stars.json';

import { pow4 } from './utils';

export interface Star {
  position: Vector3; // in light years
  color: Vector3;
  luminosity: number; // (T / T_sun)^4
  radius: number; // in km
}

const LY_TO_KM = 9.461e12;
const SUN_TEMPERATURE = 5778;

function sphericalToCartesian(rightAscension: number, declination: number, distance: number): Vector3 {
  const cosDeclination = Math.cos(declination);

  return new Vector3(
    distance * cosDeclination * Math.cos(rightAscension),
    distance * cosDeclination * Math.sin(rightAscension),
    distance * Math.sin(declination),
  );
}

// Tanner Helland's approximation: blackbody temperature → sRGB chromaticity (normalized so brightest channel = 1)
function temperatureToLinearRGB(kelvin: number): Vector3 {
  const t = kelvin / 100;

  let r: number;
  if (t <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  }

  let g: number;
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  let b: number;
  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  const sR = Math.max(0, Math.min(255, r)) / 255;
  const sG = Math.max(0, Math.min(255, g)) / 255;
  const sB = Math.max(0, Math.min(255, b)) / 255;

  // sRGB → linear (gamma 2.2 approximation)
  return new Vector3(Math.pow(sR, 2.2), Math.pow(sG, 2.2), Math.pow(sB, 2.2));
}

function parseStarCatalog(stars: typeof starsData): Star[] {
  return stars.map((star) => {
    const temperature = star.temperature || SUN_TEMPERATURE;
    const temperatureRatio = temperature / SUN_TEMPERATURE;

    return {
      position: sphericalToCartesian(star.ascension, star.declination, star.distance_ly),
      color: temperatureToLinearRGB(temperature),
      luminosity: pow4(temperatureRatio),
      radius: star.radius,
    };
  });
}

const starVert = `
attribute vec3 starColor;
attribute float surfaceBrightness;
attribute float radiusKm;

uniform vec3 uCameraPositionLy;
uniform float uPixelAngularSize;
uniform float uBrightnessMultiplier;
uniform float uRadiusMultiplier;
uniform float uMinRadius;
uniform float uMaxRadius;
uniform float uMinBrightness;
uniform float uMaxBrightness;

const float LY_TO_KM = 9.461e12;
const float PI = 3.14159265359;

varying vec3 vColor;

void main() {
    vec3 toStarLy = position - uCameraPositionLy;
    float distanceLy = length(toStarLy);

    vec3 worldDirection = toStarLy / distanceLy;
    vec4 viewDirection = viewMatrix * vec4(worldDirection, 0.0);

    // Place at far plane (clip-space z = w → NDC z = 1)
    vec4 clipPosition = projectionMatrix * vec4(viewDirection.xyz, 1.0);
    clipPosition.z = clipPosition.w;
    gl_Position = clipPosition;

    float distanceKm = distanceLy * LY_TO_KM;
    float angularRadius = atan(radiusKm / distanceKm);
    float pixelRadius = angularRadius / uPixelAngularSize * uRadiusMultiplier;

    // Sprite size: 2 * pixelRadius (diameter), but clamped to user-configurable range
    gl_PointSize = clamp(2.0 * pixelRadius, uMinRadius, uMaxRadius);

    // Per-pixel brightness: surface brightness times (star area / rendered disc area), capped at 1
    // (when clamped to uMaxRadius, can't exceed physical surface brightness)
    float fillRatio = min(1.0, 4.0 * pixelRadius * pixelRadius / (gl_PointSize * gl_PointSize));
    float perPixel = surfaceBrightness * fillRatio;
    vColor = starColor * clamp(perPixel * uBrightnessMultiplier, uMinBrightness, uMaxBrightness);
}
`;

const starFrag = `
precision highp float;

varying vec3 vColor;

void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float radius = length(offset);
    float alpha = 1.0 - smoothstep(0.4, 0.5, radius);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor * alpha, 1.0);
}
`;

export class StarField {
  readonly parsedStars: Star[];
  private readonly material: ShaderMaterial;
  private readonly geometry: BufferGeometry;
  private readonly points: Points;

  constructor() {
    this.parsedStars = parseStarCatalog(starsData);

    const starCount = this.parsedStars.length;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const surfaceBrightnesses = new Float32Array(starCount);
    const radii = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const star = this.parsedStars[i];
      positions[i * 3 + 0] = star.position.x;
      positions[i * 3 + 1] = star.position.y;
      positions[i * 3 + 2] = star.position.z;
      colors[i * 3 + 0] = star.color.x;
      colors[i * 3 + 1] = star.color.y;
      colors[i * 3 + 2] = star.color.z;
      surfaceBrightnesses[i] = star.luminosity;
      radii[i] = star.radius;
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('starColor', new BufferAttribute(colors, 3));
    this.geometry.setAttribute('surfaceBrightness', new BufferAttribute(surfaceBrightnesses, 1));
    this.geometry.setAttribute('radiusKm', new BufferAttribute(radii, 1));

    this.material = new ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: {
        uCameraPositionLy: { value: new Vector3() },
        uPixelAngularSize: { value: 0 },
        uBrightnessMultiplier: { value: 0 },
        uRadiusMultiplier: { value: 0 },
        uMinRadius: { value: 0 },
        uMaxRadius: { value: 0 },
        uMinBrightness: { value: 0 },
        uMaxBrightness: { value: 0 },
      },
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  get object(): Object3D {
    return this.points;
  }

  update(cameraPositionKm: Vector3, fovDegrees: number, windowHeight: number) {
    const uniforms = this.material.uniforms;
    uniforms.uCameraPositionLy.value.copy(cameraPositionKm).divideScalar(LY_TO_KM);

    const fovRadians = (fovDegrees * Math.PI) / 180;
    uniforms.uPixelAngularSize.value = (2 * Math.tan(fovRadians / 2)) / windowHeight;
  }

  setShaderParam(field: string, value: number) {
    this.material.uniforms[field].value = value;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
