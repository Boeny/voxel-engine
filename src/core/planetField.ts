import { AdditiveBlending, BufferAttribute, BufferGeometry, Object3D, Points, ShaderMaterial, Vector3 } from 'three';

import { LY_TO_KM } from './const';
import { Planet } from './planet';

const planetVert = `
attribute vec3 color;

uniform vec3 uCameraPositionLy;
uniform float uPointSize;

varying vec3 vColor;

void main() {
    vec3 toPlanetLy = position - uCameraPositionLy;
    float distanceLy = length(toPlanetLy);

    if (distanceLy < 1e-20) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec3(0.0);
        return;
    }

    vec3 worldDirection = toPlanetLy / distanceLy;
    vec4 viewDirection = viewMatrix * vec4(worldDirection, 0.0);

    if (viewDirection.z > 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec3(0.0);
        return;
    }

    vec4 clipPosition = projectionMatrix * vec4(viewDirection.xyz, 1.0);
    clipPosition.z = clipPosition.w;
    gl_Position = clipPosition;

    gl_PointSize = uPointSize;
    vColor = color;
}
`;

const planetFrag = `
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

export class PlanetField {
  private readonly material: ShaderMaterial;
  private readonly geometry: BufferGeometry;
  private readonly points: Points;

  constructor(planets: Planet[]) {
    const count = planets.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const ly = planets[i].positionLy;
      positions[i * 3 + 0] = ly.x;
      positions[i * 3 + 1] = ly.y;
      positions[i * 3 + 2] = ly.z;
      // Placeholder neutral color — later derive from albedo / atmosphere
      colors[i * 3 + 0] = 0.6;
      colors[i * 3 + 1] = 0.7;
      colors[i * 3 + 2] = 0.9;
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new BufferAttribute(colors, 3));

    this.material = new ShaderMaterial({
      vertexShader: planetVert,
      fragmentShader: planetFrag,
      uniforms: {
        uCameraPositionLy: { value: new Vector3() },
        uPointSize: { value: 3 },
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

  update(cameraPositionKm: Vector3) {
    this.material.uniforms.uCameraPositionLy.value.copy(cameraPositionKm).divideScalar(LY_TO_KM);
  }

  setShaderParam(field: string, value: number) {
    this.material.uniforms[field].value = value;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
