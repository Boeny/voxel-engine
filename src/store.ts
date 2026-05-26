import { Vector3 } from 'three';
import { create } from 'zustand';

import { STAR_SHADER_PARAMS } from './core/components/StarField/const';
import { Star, StarShaderParams } from './core/components/StarField/types';

interface AppState {
  appState: 'start' | 'scene';
  setAppState: (state: 'start' | 'scene') => void;

  gameState: 'playing' | 'paused';
  setGameState: (state: 'playing' | 'paused') => void;

  mapSeed: number;
  controlType: 'fpv' | 'editor';

  selectedObject: Star | null;
  select: (object: Star | null) => void;

  playNewMap: () => void;
  createNewMap: () => void;

  position: Vector3;
  backgroundPosition: Vector3;
  velocity: Vector3;
  starShaderParams: StarShaderParams;
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

  position: new Vector3(),
  backgroundPosition: new Vector3(),
  velocity: new Vector3(),
  starShaderParams: { ...STAR_SHADER_PARAMS },
}));

function getNewPlayingState(state: AppState, controlType: AppState['controlType']): Partial<AppState> {
  return {
    mapSeed: state.mapSeed + 1,
    appState: 'scene',
    gameState: 'playing',
    controlType,
  };
}

export function getState(): AppState {
  return useStore.getState();
}
