import { useRef } from 'react';

import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, ShaderMaterial } from 'three';

type Props = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, any>;
  attributes: { name: string; data: Float32Array<ArrayBufferLike>; length: number }[];
};

export const PointsCloud = ({ vertexShader, fragmentShader, uniforms, attributes }: Props) => {
  const ref = useRef<ShaderMaterial>(null);

  useFrame(() => {
    if (!ref.current) {
      return;
    }
    Object.entries(uniforms).forEach(([key, value]) => {
      ref.current!.uniforms[key].value = value;
    });
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        {attributes.map((attr, i) => (
          <bufferAttribute
            key={i}
            attach={`attributes-${attr.name}`}
            args={[attr.data, attr.length]}
          />
        ))}
      </bufferGeometry>
      <shaderMaterial
        ref={ref}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        transparent
      />
    </points>
  );
};
