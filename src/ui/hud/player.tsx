import { getDistanceText } from '@/core/utils';
import { PlayerHUDParams } from '@/types';

export function PlayerHUD() {
  return (
    <div className="absolute top-4 left-4 z-10 text-white font-mono text-sm pointer-events-none drop-shadow-md bg-black/30 p-2 rounded">
      <div id="hud-altitude"></div>
      <div id="hud-speed"></div>
      <div id="hud-grounded"></div>
    </div>
  );
}

export function updatePlayerHUD({ speed, distanceToFocusPoint, isGrounded }: PlayerHUDParams) {
  document.getElementById('hud-altitude')!.innerText = `Altitude: ${getDistanceText(distanceToFocusPoint)}`;
  document.getElementById('hud-speed')!.innerText = `Speed: ${getDistanceText(speed)}/s`;
  document.getElementById('hud-grounded')!.innerText = `Is Grounded: ${isGrounded}`;
}
