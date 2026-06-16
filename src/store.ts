import { Euler, Vector3 } from 'three';
import { create } from 'zustand';

import { BACKGROUND_SHADER_PARAMS } from './core/components/BackgroundPointsField/const';
import { BackgroundPoint, BackgroundShaderParams } from './core/components/BackgroundPointsField/types';

interface AppState {
  appState: 'start' | 'scene';
  setAppState: (state: 'start' | 'scene') => void;

  gameState: 'playing' | 'paused';
  setGameState: (state: 'playing' | 'paused') => void;

  mapSeed: number;
  controlType: 'fpv' | 'editor';

  selectedObject: BackgroundPoint | null;
  select: (object: BackgroundPoint | null) => void;
  selectionRingEl: HTMLDivElement | null;
  setSelectionRingEl: (el: HTMLDivElement | null) => void;

  playNewMap: () => void;
  createNewMap: () => void;

  startRotation: Euler;
  rotation: Euler;
  startPosition: Vector3;
  position: Vector3;
  velocity: Vector3;
  backgroundStartPosition: Vector3;
  backgroundPosition: Vector3;
  backgroundVelocity: Vector3;
  backgroundSpeed: number;
  backgroundShaderParams: BackgroundShaderParams;
  backgroundData: BackgroundPoint[];

  setStartPosition: () => void;
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
  selectionRingEl: null,
  setSelectionRingEl: (selectionRingEl) => set({ selectionRingEl }),

  playNewMap: () => set((state) => getNewPlayingState(state, 'fpv')),
  createNewMap: () => set((state) => getNewPlayingState(state, 'editor')),

  startRotation: new Euler(),
  rotation: new Euler(),
  startPosition: new Vector3(),
  position: new Vector3(),
  velocity: new Vector3(),

  backgroundStartPosition: new Vector3(),
  backgroundPosition: new Vector3(),
  backgroundVelocity: new Vector3(),
  backgroundSpeed: 2,
  backgroundShaderParams: { ...BACKGROUND_SHADER_PARAMS },
  backgroundData: [],

  setStartPosition: () => {
    set((state) => ({
      startPosition: state.position,
      startRotation: state.rotation,
      backgroundStartPosition: state.backgroundPosition,
    }));
  },
}));

function getNewPlayingState(state: AppState, controlType: AppState['controlType']): Partial<AppState> {
  return {
    mapSeed: state.mapSeed + 1,
    appState: 'scene',
    gameState: 'playing',
    controlType,
    position: state.startPosition,
    rotation: state.startRotation,
    backgroundPosition: state.backgroundStartPosition,
  };
}

export function getState(): AppState {
  return useStore.getState();
}
