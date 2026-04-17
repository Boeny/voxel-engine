import React from 'react';

import { useStore } from '../store';

export const MainMenu: React.FC = () => {
  const { setGameState, createNewMap, gameState } = useStore();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 text-white z-50">
      <div className="flex flex-col space-y-4 w-64">
        <h1 className="text-4xl font-bold text-center mb-8">Voxel World</h1>
        {gameState !== 'menu' && (
          <button
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded text-lg font-medium transition-colors"
            onClick={() => setGameState('playing')}
          >
            Продолжить
          </button>
        )}
        <button
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded text-lg font-medium transition-colors"
          onClick={() => createNewMap()}
        >
          Создать карту
        </button>
      </div>
    </div>
  );
};
