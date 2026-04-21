import { create } from 'zustand';

export interface AppState {
  gameState: 'menu' | 'playing' | 'paused';
  mapSeed: number;
  controlType: 'fpv' | 'editor';
  setGameState: (state: 'menu' | 'playing' | 'paused') => void;
  playNewMap: () => void;
  createNewMap: () => void;
}

export const useStore = create<AppState>((set) => ({
  gameState: 'menu',
  mapSeed: 0,
  controlType: 'editor',
  setGameState: (state) => set({ gameState: state }),
  playNewMap: () => set((state) => ({ mapSeed: state.mapSeed + 1, gameState: 'playing', controlType: 'fpv' })),
  createNewMap: () => set((state) => ({ mapSeed: state.mapSeed + 1, gameState: 'playing', controlType: 'editor' })),
}));
