import { create } from 'zustand';

import { SelectableObject } from './core/selectableObject';

export type RenderMode = 'atmosphere' | 'voxel';

export interface AppState {
  appState: 'start' | 'scene';
  setAppState: (state: 'start' | 'scene') => void;

  gameState: 'playing' | 'paused';
  setGameState: (state: 'playing' | 'paused') => void;

  mapSeed: number;
  controlType: 'fpv' | 'editor';

  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;

  objects: SelectableObject[];
  setObjects: (objects: SelectableObject[]) => void;

  selectedObject: SelectableObject | null;
  select: (object: SelectableObject | null) => void;

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

  renderMode: 'atmosphere',
  setRenderMode: (renderMode) => set({ renderMode }),

  objects: [],
  setObjects: (objects) => set({ objects }),

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
