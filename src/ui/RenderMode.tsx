import { RenderMode as RenderModeType, useStore } from '@/store';

const RENDER_MODES: { value: RenderModeType; label: string; description: string }[] = [
  { value: 'atmosphere', label: 'Atmosphere', description: 'Fullscreen raycast — atmosphere & planet surface shader' },
  { value: 'voxel', label: 'Voxel', description: 'Billboard quads — rasterized voxel geometry + atmosphere overlay' },
];

export function RenderMode() {
  const renderMode = useStore((state) => state.renderMode);
  const setRenderMode = useStore((state) => state.setRenderMode);

  return (
    <div className="border border-gray-600 rounded p-3 space-y-2">
      <p className="text-xs text-gray-400 uppercase tracking-wider">Render mode</p>
      {RENDER_MODES.map(({ value, label, description }) => (
        <label
          key={value}
          className="flex items-start gap-3 cursor-pointer group"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="radio"
            name="renderMode"
            value={value}
            checked={renderMode === value}
            onChange={() => setRenderMode(value)}
            className="mt-1 accent-blue-500"
          />
          <div>
            <span className="font-medium group-hover:text-blue-300 transition-colors">{label}</span>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
