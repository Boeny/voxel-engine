import { create } from 'zustand';

interface AppState {
  gameState: 'menu' | 'playing' | 'paused';
  mapSeed: number;
  setGameState: (state: 'menu' | 'playing' | 'paused') => void;
  createNewMap: () => void;
}

export const useStore = create<AppState>((set) => ({
  gameState: 'menu',
  mapSeed: 0,
  setGameState: (state) => set({ gameState: state }),
  createNewMap: () => set((state) => ({ mapSeed: state.mapSeed + 1, gameState: 'playing' })),
}));
