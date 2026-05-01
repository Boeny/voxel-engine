import { memo } from 'react';

import { useStore } from '@/store';

import { EditorHUD } from './editor';
import { PlayerHUD } from './player';

export const HUD = memo(() => {
  const controlType = useStore((state) => state.controlType);

  return controlType === 'fpv' ? <PlayerHUD /> : <EditorHUD />;
});
