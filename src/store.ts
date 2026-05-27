import { Vector3 } from 'three';
import { create } from 'zustand';

import { BACKGROUND_SHADER_PARAMS } from './core/components/BackgroundPointsField/const';
import { BackgroundPoint, BackgroundShaderParams } from './core/components/BackgroundPointsField/types';
import { parseStarCatalog } from './core/components/BackgroundPointsField/utils';

const stars = parseStarCatalog();

interface AppState {
  appState: 'start' | 'scene';
  setAppState: (state: 'start' | 'scene') => void;

  gameState: 'playing' | 'paused';
  setGameState: (state: 'playing' | 'paused') => void;

  mapSeed: number;
  controlType: 'fpv' | 'editor';

  selectedObject: BackgroundPoint | null;
  select: (object: BackgroundPoint | null) => void;

  playNewMap: () => void;
  createNewMap: () => void;

  position: Vector3;
  backgroundPosition: Vector3;
  velocity: Vector3;
  backgroundVelocityScale: number;
  backgroundShaderParams: BackgroundShaderParams;
  backgroundData: BackgroundPoint[];
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
  backgroundVelocityScale: 2,
  backgroundShaderParams: { ...BACKGROUND_SHADER_PARAMS },
  backgroundData: stars,
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
