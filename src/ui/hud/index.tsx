import { useStore } from '@/store';

import { EditorHUD } from './editor';
import { PlayerHUD } from './player';

export function HUD() {
  const controlType = useStore((state) => state.controlType);

  return controlType === 'fpv' ? <PlayerHUD /> : <EditorHUD />;
}
