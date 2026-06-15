import { useControls } from 'leva';

import { BackgroundPoint } from '@/core/components/BackgroundPointsField/types';
import { getState, useStore } from '@/store';
import { getControlParams } from '@/utils';

// function PlanetParams({ selectedObject }: { selectedObject: Planet }) {
//   useControls('Selected Object Settings', () => {
//     return getControlParams(selectedObject, {
//       useAtmosphere: [],
//       atmosphereUseMie: [],
//       useTransmittance: [],
//       radius: [1000, 7000, 1],
//       atmosphereHeight: [0, 300, 1],
//       rotationSpeed: [0, 100, 0.01],
//       angle: [0, 360, 0.01],
//       atmosphereRayleighScaleHeight: [5, 20, 0.1], // 5-8 km (standart 8), density falloff for blue sky: 25% of atmosphere thickness
//       atmosphereMieScaleHeight: [0, 5, 0.1], // 2-5 km (standart 1,5-2,5), density falloff for sun halo: 5% of atmosphere thickness
//       atmosphereMiePreferredScatteringDirection: [-1, 1, 0.01], // > 0: Sun halo, 0.75- 0.95
//       atmosphereMieAbsorption: [0, 1, 0.1], // standart - 10% of scattering
//       atmosphereRaymarchStepsCount: [1, 128, 8], // 16
//       secondAtmSteps: [1, 32, 4],
//     });
//   });

//   return null;
// }

function BackgroundPointControls({ point }: { point: BackgroundPoint }) {
  useControls('Selected Object Settings', () => {
    return getControlParams(point, {
      //luminosity: [0.1, 100, 0.01],
    });
  });

  return null;
}

function SelectedObjectControls() {
  const selectedObject = useStore((state) => state.selectedObject);

  if (selectedObject) {
    return <BackgroundPointControls point={selectedObject} />;
  }

  return null;
}

export const EditorHUD = () => {
  useControls('Background points params', () =>
    getControlParams(getState(), {
      backgroundSpeed: [],
    }),
  );
  useControls('Background points shader params', () =>
    getControlParams(getState().backgroundShaderParams, {
      uBrightnessMultiplier: [10, 1e13, 1000], // 3e11 for realistic
      uRadiusMultiplier: [1, 10, 0.5], // 1 for realistic
      uMinRadius: [1, 10, 0.5], // 3 for realistic
      uMinBrightness: [0, 10, 0.01], // 0 for realistic
      uMaxBrightness: [1, 10, 0.5], // 10 for realistic
      uBackgroundToLocalScale: [], // 9461000000000
    }),
  );

  return (
    <>
      <SelectedObjectControls />
      <div className="absolute top-4 left-4 z-10 text-white font-mono text-sm pointer-events-none drop-shadow-md bg-black/30 p-2 rounded">
        <div id="hud-fps"></div>
        <div id="hud-selected-name"></div>
        <div id="hud-altitude"></div>
        <div id="hud-bkspeed"></div>
        <div id="hud-speed"></div>
        <div id="hud-grounded"></div>
        <div id="hud-bkposition"></div>
        <div id="hud-position"></div>
        <div id="hud-rotation"></div>
        <div id="hud-exposure"></div>
        <button
          className=""
          onClick={() => getState().setStartPosition()}
        >
          Set start position
        </button>
      </div>
    </>
  );
};
