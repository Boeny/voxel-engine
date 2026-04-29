import { Leva, useControls } from 'leva';

import { Planet } from '@/core/planet';
import { Star } from '@/core/star';
import { getControlParams, getDistanceText } from '@/core/utils';
import { useStore } from '@/store';
import { EditorHUDParams } from '@/types';

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
    }) as any;
  });

  return null;
}

function StarParams({ selectedObject }: { selectedObject: Star }) {
  useControls('Selected Object Settings', () => {
    return getControlParams(selectedObject, {
      intensity: [1, 100, 0.01],
    }) as any;
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

const stopPropagation = (e: any) => e.stopPropagation();

function SelectableObjects() {
  const objects = useStore((state) => state.objects);
  const select = useStore((state) => state.select);
  const selectedObject = useStore((state) => state.selectedObject);

  return (
    <div
      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5"
      onPointerDown={stopPropagation}
      onPointerUp={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onClick={stopPropagation}
    >
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

export function EditorHUD() {
  return (
    <>
      <div
        onPointerDown={stopPropagation}
        onPointerUp={stopPropagation}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        onClick={stopPropagation}
        onWheel={stopPropagation} // Если нужно заблокировать скролл
      >
        <Leva
          //theme={myTheme} // you can pass a custom theme (see the styling section)
          fill={false} // default = false, true makes the pane fill the parent dom node it's rendered in
          flat={false} // default = false, true removes border radius and shadow
          oneLineLabels // default = false, alternative layout for labels, with labels and fields on separate rows
          //hideTitleBar // default = false, hides the GUI header
          collapsed={false} // default = false, when true the GUI is collapsed
          hidden={false} // default = false, when true the GUI is hidden
          neverHide // default = false, when true the GUI stays visible even when no controls are mounted
          hideCopyButton // default = false, hides the copy button in the title bar
          titleBar={{
            // Configure title bar options
            title: 'Selected Object Settings', // Custom title
            drag: false, // Enable dragging
            filter: false, // Enable filter/search
            position: { x: 0, y: 0 }, // Initial position (when drag is enabled)
            onDrag: (_position) => {}, // Callback when dragged
          }}
        />
        <SelectedObjectParams />
      </div>

      <div className="absolute top-4 left-4 z-10 text-white font-mono text-sm pointer-events-none drop-shadow-md bg-black/30 p-2 rounded">
        <div id="hud-altitude"></div>
        <div id="hud-grounded"></div>
        <div id="hud-position"></div>
      </div>

      <SelectableObjects />
    </>
  );
}

export function updateEditorHUD({ distanceToFocusPoint, isGrounded, cameraPosition: { x, y, z } }: EditorHUDParams) {
  document.getElementById('hud-altitude')!.innerText = `Altitude: ${getDistanceText(distanceToFocusPoint)}`;
  document.getElementById('hud-grounded')!.innerText = `Is Grounded: ${isGrounded}`;
  document.getElementById('hud-position')!.innerText = `Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
}
