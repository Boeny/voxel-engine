import { Leva, useControls } from 'leva';

import { Planet } from '@/core/planet';
import { Star } from '@/core/star';
import { getControlParams, getDistanceText } from '@/core/utils';
import { useStore } from '@/store';
import { EditorHUDParams } from '@/types';

function PlanetParams({ selectedObject }: { selectedObject: Planet }) {
  useControls('Selected Object Settings', () => {
    return getControlParams(selectedObject, {
      planetRadius: ['radius', 1_000_000, 7_000_000, 1000],
      atmosphereHeight: ['atmosphereHeight', 0, 100_000, 1],
      planetRotationSpeed: ['rotationSpeed', 0, 1, 0.01],
      planetAngle: ['angle', 0, 360, 0.01],
      skyBrightness: ['skyBrightness', 0, 50, 0.1],
      rayleighScaleHeight: ['atmosphereRayleighScaleHeight', 1000, 20000, 1],
      mieScaleHeight: ['atmosphereMieScaleHeight', 1000, 20000, 1],
      miePreferredScatteringDirection: ['atmosphereMiePreferredScatteringDirection', 0, 0.99, 0.01],
      atmosphereRaymarchStepsCount: ['atmosphereRaymarchStepsCount', 1, 32, 1],
      atmosphereRaymarchDistance: ['atmosphereRaymarchDistance', 0, 50000, 1],
      ozoneIntensity: ['ozoneIntensity', 0, 5, 0.01],
      ozoneCenterHeight: ['ozoneCenterHeight', 0, 50_000, 1],
      ozoneThickness: ['ozoneThickness', 0, 50_000, 1],
    }) as any;
  });

  return null;
}

function StarParams({ selectedObject }: { selectedObject: Star }) {
  useControls('Selected Object Settings', () => {
    return getControlParams(selectedObject, {
      sunIntensity: ['intensity', 0, 20, 0.01],
      sunAngle: ['angle', 0, 360, 0.01],
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
    </>
  );
}

export function updateEditorHUD({ distanceToFocusPoint, isGrounded, cameraPosition: { x, y, z } }: EditorHUDParams) {
  document.getElementById('hud-altitude')!.innerText = `Altitude: ${getDistanceText(distanceToFocusPoint)}`;
  document.getElementById('hud-grounded')!.innerText = `Is Grounded: ${isGrounded}`;
  document.getElementById('hud-position')!.innerText = `Position: (${x}, ${y}, ${z})`;
}
