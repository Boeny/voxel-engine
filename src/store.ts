import { create } from 'zustand';

import { Planet } from './core/planet';
import { Star } from './core/star';

export interface AppState {
  appState: 'start' | 'scene';
  gameState: 'playing' | 'paused';
  mapSeed: number;
  controlType: 'fpv' | 'editor';
  selectedObject: Planet | Star | null;
  select: (object: Planet | Star | null) => void;
  setGameState: (state: 'playing' | 'paused') => void;
  playNewMap: () => void;
  createNewMap: () => void;
}

export const useStore = create<AppState>((set) => ({
  appState: 'start',
  gameState: 'paused',
  mapSeed: 0,
  controlType: 'editor',
  selectedObject: null,
  select: (selectedObject) => set({ selectedObject }),
  setGameState: (state) => set({ gameState: state }),
  playNewMap: () => set((state) => getNewPlayingState(state, 'fpv')),
  createNewMap: () => set((state) => getNewPlayingState(state, 'editor')),
}));

function getNewPlayingState(state: AppState, controlType: AppState['controlType']): Partial<AppState> {
  return {
    mapSeed: state.mapSeed + 1,
    appState: 'scene',
    gameState: 'playing',
    controlType,
  };
}
