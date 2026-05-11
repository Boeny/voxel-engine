import { DataTexture, FloatType, NearestFilter, RGBAFormat, Vector3 } from 'three';

import starsData from '@/data/stars.json';

import { arrayToVector, mul, sub } from './utils';

interface ParsedStar {
  position: Vector3; // in light years
  color: Vector3;
  intensity: number;
  radius: number;
  coronaIntensity: number;
  coronaRadius: number;
}

// Approximate star colors by spectral class (linear RGB, not sRGB)
const STAR_COLORS: Record<string, [number, number, number]> = {
  O: [0.6, 0.7, 1.0],
  B: [0.7, 0.8, 1.0],
  A: [0.9, 0.95, 1.0],
  F: [1.0, 0.98, 0.9],
  G: [1.0, 0.95, 0.8],
  K: [1.0, 0.8, 0.5],
  M: [1.0, 0.5, 0.3],
};

function sphericToDecart(rightAscension: number, declination: number, distance: number) {
  const cosDec = Math.cos(declination);
  const x = distance * cosDec * Math.cos(rightAscension);
  const y = distance * cosDec * Math.sin(rightAscension);
  const z = distance * Math.sin(declination);

  return new Vector3(x, y, z);
}

// function getLuminosity(temperature: number) {
//   return temperature * 100;
// }

function parseStarCatalog(stars: typeof starsData): ParsedStar[] {
  //const sun = stars[0];

  return stars.map((star) => {
    let spectral = star.spectral_type[0];
    if (spectral === 'd') {
      spectral = star.spectral_type[1];
    }

    //const sunRadiuses = star.radius / sun.radius;

    return {
      position: sphericToDecart(star.ascension, star.declination, star.distance_ly),
      color: arrayToVector(STAR_COLORS[spectral] || STAR_COLORS.M),
      intensity: 100,
      // pow4((star.temperature || SPECTRAL_TEMP[spectral]) / sun.temperature) *
      // (sunRadiuses * sunRadiuses) *
      // getLuminosity(sun.temperature),
      radius: star.radius,
      coronaIntensity: 0.001,
      coronaRadius: 20 * star.radius,
    };
  });
}

function directionToEquirectUV(direction: Vector3): [number, number] {
  const theta = Math.acos(Math.max(-1, Math.min(1, direction.y)));
  const phi = Math.atan2(direction.z, direction.x);

  return [0.5 + phi / (2 * Math.PI), theta / Math.PI];
}

export class StarMap {
  LY_TO_KM = 9.461e12;
  STAR_MAP_REBUILD_DISTANCE = 1; // light years
  MIN_STAR_DISK_SIZE_PIXELS = 1; // Star disk is rendered in 3D when it spans at least this many pixels on screen

  private readonly data: Float32Array;
  private readonly texture: DataTexture;
  readonly parsedStars: ParsedStar[] = [];

  private lastStarCameraPositionLy: Vector3 | null = null;
  private oldFov = 0;
  private oldWindowHeight = 0;

  constructor(
    public width: number,
    public height: number,
    private setShaderParams: (params: Record<string, any>) => void,
  ) {
    this.data = new Float32Array(width * height * 4);
    this.texture = new DataTexture(this.data, width, height, RGBAFormat, FloatType);
    this.texture.minFilter = NearestFilter;
    this.texture.magFilter = NearestFilter;
    this.setShaderParams({ uStarMap: this.texture });

    this.parsedStars = parseStarCatalog(starsData);
  }

  private clear() {
    this.data.fill(0);
  }

  private writeStarPixel(direction: Vector3, color: Vector3, brightness: number) {
    const [u, v] = directionToEquirectUV(direction);
    const pixelX = Math.floor(u * this.width) % this.width;
    const pixelY = Math.floor(v * this.height) % this.height;
    const index = (pixelY * this.width + pixelX) * 4;

    this.data[index + 0] += color.x * brightness;
    this.data[index + 1] += color.y * brightness;
    this.data[index + 2] += color.z * brightness;
    this.data[index + 3] = 1;
  }

  private updateMinDiskAngularSize(fov: number, windowHeight: number) {
    if (fov === this.oldFov && windowHeight === this.oldWindowHeight) {
      //return;
    }

    this.oldFov = fov;
    this.oldWindowHeight = windowHeight;

    const fovRad = (fov * Math.PI) / 180;
    const pixelAngularSize = (2 * Math.tan(fovRad / 2)) / windowHeight;

    this.setShaderParams({ uMinDiskAngularSize: pixelAngularSize * this.MIN_STAR_DISK_SIZE_PIXELS });
  }

  rebuild(camPos: Vector3, fov: number, windowHeight: number) {
    this.updateMinDiskAngularSize(fov, windowHeight);
    const cameraPositionLy = mul(camPos, 1 / this.LY_TO_KM);

    if (this.lastStarCameraPositionLy && cameraPositionLy.distanceTo(this.lastStarCameraPositionLy) < this.STAR_MAP_REBUILD_DISTANCE) {
      return;
    }
    this.lastStarCameraPositionLy = cameraPositionLy;

    this.clear();

    for (const star of this.parsedStars) {
      const directionToStar = sub(star.position, cameraPositionLy);
      const distanceLy = directionToStar.length();

      // normalize
      directionToStar.divideScalar(distanceLy);

      const brightness = star.intensity / (distanceLy * distanceLy);
      this.writeStarPixel(directionToStar, star.color, brightness);
    }

    this.texture.needsUpdate = true;
  }
}
