import { memo } from 'react';

import { useControls } from 'leva';

import { Planet } from '@/core/planet';
import { Star } from '@/core/star';
import { getControlParams } from '@/core/utils';
import { useStore } from '@/store';

function PlanetParams({ selectedObject }: { selectedObject: Planet }) {
  useControls('Atmosphere Features', () => ({
    'Mie Scattering': {
      value: selectedObject.atmosphereUseMie,
      onChange: (v: boolean) => {
        selectedObject.atmosphereUseMie = v;
      },
    },
    'Light Transmittance (color extinction)': {
      value: selectedObject.useTransmittance,
      onChange: (v: boolean) => {
        selectedObject.useTransmittance = v;
      },
    },
  }));

  useControls('Selected Object Settings', () => {
    return getControlParams(selectedObject, {
      radius: [1000, 7000, 1],
      atmosphereHeight: [0, 300, 1],
      rotationSpeed: [0, 100, 0.01],
      angle: [0, 360, 0.01],
      atmosphereRayleighScaleHeight: [5, 20, 0.1], // 5-8 km (standart 8), density falloff for blue sky: 25% of atmosphere thickness
      atmosphereMieScaleHeight: [0, 5, 0.1], // 2-5 km (standart 1,5-2,5), density falloff for sun halo: 5% of atmosphere thickness
      atmosphereMiePreferredScatteringDirection: [-1, 1, 0.01], // > 0: Sun halo, 0.75- 0.95
      atmosphereMieAbsorption: [0, 1, 0.1], // standart - 10% of scattering
      atmosphereRaymarchStepsCount: [1, 128, 8], // 16
      secondAtmSteps: [1, 32, 4],
    });
  });

  return null;
}

function StarParams({ selectedObject }: { selectedObject: Star }) {
  useControls('Selected Object Settings', () => {
    return getControlParams(selectedObject, {
      intensity: [0.1, 100, 0.01],
      coronaRadius: [0.001, 50, 0.1],
      coronaIntensity: [0.001, 0.1, 0.0001],
    });
  });

  return null;
}

function SelectedObjectParams() {
  const selectedObject = useStore((state) => state.selectedObject);

  if (selectedObject instanceof Planet) {
    return <PlanetParams selectedObject={selectedObject} />;
  }

  if (selectedObject instanceof Star) {
    return <StarParams selectedObject={selectedObject} />;
  }

  return null;
}

function SelectableObjects() {
  const objects = useStore((state) => state.objects);
  const select = useStore((state) => state.select);
  const selectedObject = useStore((state) => state.selectedObject);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
      {objects.map((obj) => {
        const isSelected = selectedObject === obj;

        return (
          <button
            key={obj.type}
            onClick={() => select(isSelected ? null : obj)}
            className={[
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-150 cursor-pointer select-none',
              isSelected
                ? 'bg-blue-500/30 border border-blue-400/70 text-blue-100 shadow-lg shadow-blue-900/30'
                : 'bg-black/40 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/25 hover:text-white',
            ].join(' ')}
          >
            <span className="capitalize tracking-wide">{obj.type}</span>
            {isSelected && (
              <span className="ml-auto text-blue-400/80">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                >
                  <circle
                    cx="5"
                    cy="5"
                    r="3"
                  />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const EditorHUD = memo(() => {
  return (
    <>
      <SelectedObjectParams />

      <div className="absolute top-4 left-4 z-10 text-white font-mono text-sm pointer-events-none drop-shadow-md bg-black/30 p-2 rounded">
        <div id="hud-altitude"></div>
        <div id="hud-grounded"></div>
        <div id="hud-position"></div>
        <div id="hud-exposure"></div>
      </div>

      <SelectableObjects />
    </>
  );
});
