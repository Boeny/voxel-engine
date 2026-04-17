import React, { useEffect } from 'react';

import { Engine } from './core/engine';
import { setupEvents, cleanupEvents } from './events';
import { useStore } from './store';
import { MainMenu } from './ui/MainMenu';

export default function App() {
  const gameState = useStore((state) => state.gameState);
  const mapSeed = useStore((state) => state.mapSeed);

  useEffect(() => {
    // Setup global events
    setupEvents({
      keydown: (e: Event) => {
        const state = useStore.getState();
        if (state.gameState === 'menu') {
          return;
        }

        if ((e as KeyboardEvent).code === 'Escape') {
          state.setGameState(state.gameState === 'playing' ? 'paused' : 'playing');
        }
      },
    });

    return () => {
      cleanupEvents();
    };
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {gameState !== 'menu' && <Engine key={mapSeed} />}
      {gameState !== 'playing' && <MainMenu />}
    </div>
  );
}
