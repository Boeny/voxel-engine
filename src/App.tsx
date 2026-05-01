import { Leva } from 'leva';

import { Engine } from './core/engine';
import { useStore } from './store';
import { MainMenu } from './ui/MainMenu';

const stopPropagation = (e: any) => e.stopPropagation();

export default function App() {
  const appState = useStore((state) => state.appState);
  const gameState = useStore((state) => state.gameState);
  const mapSeed = useStore((state) => state.mapSeed);

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {appState === 'scene' && <Engine key={mapSeed} />}
      {gameState === 'paused' && <MainMenu />}
      <div
        onPointerDown={stopPropagation}
        onPointerUp={stopPropagation}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        onClick={stopPropagation}
        onWheel={stopPropagation}
      >
        <Leva
          oneLineLabels={false}
          hidden={false}
          neverHide={false}
          hideCopyButton
          titleBar={{
            title: 'Selected Object Settings',
            drag: false,
            filter: false,
          }}
        />
      </div>
    </div>
  );
}
