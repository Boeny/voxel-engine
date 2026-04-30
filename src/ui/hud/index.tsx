import { AutoExposureEffect } from '@/shaders/autoExposure';
import { useStore } from '@/store';

import { EditorHUD } from './editor';
import { PlayerHUD } from './player';

export function HUD({ autoExposure }: { autoExposure: AutoExposureEffect }) {
  const controlType = useStore((state) => state.controlType);

  return controlType === 'fpv' ? <PlayerHUD /> : <EditorHUD autoExposure={autoExposure} />;
}
