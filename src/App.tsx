import { Engine } from './core/engine';
import { useStore } from './store';
import { MainMenu } from './ui/MainMenu';

export default function App() {
  const appState = useStore((state) => state.appState);
  const gameState = useStore((state) => state.gameState);
  const mapSeed = useStore((state) => state.mapSeed);

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {appState === 'scene' && <Engine key={mapSeed} />}
      {gameState === 'paused' && <MainMenu />}
    </div>
  );
}
