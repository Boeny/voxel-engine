import { Engine } from './core/engine';
import { useStore } from './store';
import { MainMenu } from './ui/MainMenu';

export default function App() {
  const gameState = useStore((state) => state.gameState);
  const mapSeed = useStore((state) => state.mapSeed);

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {gameState !== 'menu' && <Engine key={mapSeed} />}
      {gameState !== 'playing' && <MainMenu />}
    </div>
  );
}
