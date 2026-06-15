import { useEffect, useRef, useState } from 'react';

import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';

import { getState } from '@/store';

import { PointsCloud } from '../PointsCloud';

import frag from './shaders/frag.glsl?raw';
import vert from './shaders/vert.glsl?raw';

const STAR_BIN_PATH = '/assets/stars.dat';
const STAR_JSON_PATH = '/assets/stars.json';

const BINARY_ITEM_LENGTH = 8;

const ATTRIBUTES = [
  { name: 'position', length: 3 },
  { name: 'color', length: 3 },
  { name: 'luminosity', length: 1 },
  { name: 'radius', length: 1 },
  { name: 'isSelected', length: 1 },
] as const;

async function loadBinaryFile(url: string): Promise<Float32Array> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const floatArray = new Float32Array(buffer);

  return floatArray;
}

async function loadJSON(url: string): Promise<any> {
  const response = await fetch(url);

  return response.json();
}

type Attribute = {
  name: string;
  length: number;
  data: Float32Array<ArrayBufferLike>;
};

function getAttributes(
  count: number,
  getValue: (attr: (typeof ATTRIBUTES)[number], itemIndex: number, valueIndex: number, offset: number) => number,
): Attribute[] {
  const result: Attribute[] = ATTRIBUTES.map((attr) => ({
    ...attr,
    data: new Float32Array(count * attr.length),
  }));

  for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
    let offset = 0;

    ATTRIBUTES.forEach((attr, attrIndex) => {
      for (let valueIndex = 0; valueIndex < attr.length; valueIndex += 1) {
        result[attrIndex].data[itemIndex * attr.length + valueIndex] =
          attr.name === 'isSelected' ? 0 : getValue(attr, itemIndex, valueIndex, offset);
      }

      offset += attr.length;
    });
  }

  return result;
}

// getAttributes(data.length, (attr, itemIndex, valueIndex) => toArray(data[itemIndex][attr.name])[valueIndex]));

export const BackgroundPointsField = () => {
  //const { raycaster, camera, scene } = useThree();
  const { backgroundShaderParams: shaderParams } = getState();
  const [attributes, setAttributes] = useState<Attribute[] | null>(null);
  const metaRef = useRef<Record<number, { name: string; spectral_type: string }>>({});

  useEffect(() => {
    loadBinaryFile(STAR_BIN_PATH).then((floatArray) => {
      setAttributes(
        getAttributes(
          floatArray.length / BINARY_ITEM_LENGTH,
          (attr, itemIndex, valueIndex, offset) => floatArray[itemIndex * BINARY_ITEM_LENGTH + valueIndex + offset],
        ),
      );
    });
    loadJSON(STAR_JSON_PATH).then((meta) => {
      metaRef.current = meta;
    });
  }, []);

  useFrame((state) => {
    const { backgroundPosition, backgroundVelocity } = getState();
    shaderParams.uCameraBackgroundPosition.copy(backgroundPosition);

    const fov = (state.camera as PerspectiveCamera).fov;
    const fovRadians = (fov * Math.PI) / 180;
    shaderParams.uPixelAngularSize = (2 * Math.tan(fovRadians / 2)) / window.innerHeight;

    backgroundPosition.add(backgroundVelocity);
  });

  if (!attributes) {
    return null;
  }

  return (
    <PointsCloud
      vertexShader={vert}
      fragmentShader={frag}
      uniforms={shaderParams}
      attributes={attributes}
      onClick={(event, _point) => {
        const meta = metaRef.current[event.index as keyof typeof metaRef.current];
        console.log(event.index, attributes[0].data[event.index! * BINARY_ITEM_LENGTH], meta);

        getState().select(
          event.index === undefined
            ? null
            : {
                name: meta?.name || 'Unknown',
                position: new Vector3(
                  attributes[0].data[event.index * BINARY_ITEM_LENGTH],
                  attributes[0].data[event.index * BINARY_ITEM_LENGTH + 1],
                  attributes[0].data[event.index * BINARY_ITEM_LENGTH + 2],
                ),
                radius: attributes[3].data[event.index * BINARY_ITEM_LENGTH + 3] || 0,
                type: 'background',
              },
        );

        return;

        // shaderParams.uClickPoint.copy(new Vector2(point.x / window.innerWidth, 1 - point.y / window.innerHeight));
        // attributes[4].data.set([1], 0);

        // return;

        // const clickPoint = new Vector2((2 * point.x) / window.innerWidth - 1, 1 - (2 * point.y) / window.innerHeight);
        // raycaster.setFromCamera(clickPoint, camera);
        // // Настраиваем радиус «чувствительности» клика в мировых единицах
        // // Подберите значение под ваш масштаб сцены (например, 0.1 или 1.0)
        // raycaster.params.Points = { threshold: 1.0 };

        // // Ищем пересечения только с объектами Points на сцене
        // const intersects = raycaster.intersectObjects(scene.children, true);

        // if (intersects.length > 0) {
        //   // Получаем внутренний индекс точки, по которой кликнули
        //   const starIndex = intersects[0].index;
        //   if (starIndex !== undefined) {
        //     const selectedStar = attributes[starIndex];

        //     // Записываем объект в стор
        //     getState().select(selectedStar);

        //     // Передаем позицию выбранной звезды в юниформы шейдера
        //     // Предполагаю, что у вас координаты лежат в star.position (Vector3)
        //     shaderParams.uClickPoint.copy(selectedStar.position);
        //     // shaderParams.uIsSelected.value = 1.0; // Включаем подсветку
        //     return;
        //   }
        // }

        // getState().select(null);
      }}
    />
  );
};

// Создаем кастомный рейкастер с радиусом захвата точки (например, 0.1 или 0.2)
// const pointsRaycast = (踩, intersects) => {
//   // Настраиваем чувствительность клика по точкам
//   踩.raycaster.params.Points.threshold = 0.2;
//   return THREE.Points.prototype.raycast.call(踩, 踩.raycaster, intersects);
// };

// // ... внутри вашего компонента:
// return (
//   <points
//     onClick={onPointClick}
//     raycast={pointsRaycast} // Переопределяем стандартный клик
//   >
//     {/* ... геометрия и материал ... */}
//   </points>
// );
