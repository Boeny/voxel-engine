import { create } from 'zustand';

import { Planet } from './core/planet';
import { Star } from './core/star';

export interface AppState {
  appState: 'start' | 'scene';
  setAppState: (state: 'start' | 'scene') => void;
  gameState: 'playing' | 'paused';
  setGameState: (state: 'playing' | 'paused') => void;
  mapSeed: number;
  controlType: 'fpv' | 'editor';
  selectedObject: Planet | Star | null;
  select: (object: Planet | Star | null) => void;

  playNewMap: () => void;
  createNewMap: () => void;
}

export const useStore = create<AppState>((set) => ({
  appState: 'start',
  setAppState: (appState) => set({ appState }),
  gameState: 'paused',
  setGameState: (gameState) => set({ gameState }),
  mapSeed: 0,
  controlType: 'editor',
  selectedObject: null,
  select: (selectedObject) => set({ selectedObject }),
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
