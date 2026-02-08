// Bottom overlay toolbar with layer toggle buttons and FOV indicator

import {
  Stars,
  GitBranch,
  Type,
  Globe2,
  Grid3x3,
  CircleDot,
  ImageIcon,
  Orbit,
  CloudSun,
  Compass,
  Maximize,
} from 'lucide-react';
import { usePlanetariumStore } from '../../stores/planetariumStore';

interface PlanetariumToolbarProps {
  className?: string;
}

const layerButtons = [
  { key: 'stars' as const, icon: Stars, label: 'Stars', shortcut: 'S' },
  { key: 'constellationLines' as const, icon: GitBranch, label: 'Lines', shortcut: 'C' },
  { key: 'constellationLabels' as const, icon: Type, label: 'Labels', shortcut: 'L' },
  { key: 'dsos' as const, icon: CircleDot, label: 'DSOs', shortcut: 'D' },
  { key: 'dsoImages' as const, icon: ImageIcon, label: 'DSO Images', shortcut: 'I' },
  { key: 'planets' as const, icon: Globe2, label: 'Planets', shortcut: 'P' },
  { key: 'altAzGrid' as const, icon: Grid3x3, label: 'Alt/Az', shortcut: 'G' },
  { key: 'equatorialGrid' as const, icon: Orbit, label: 'EQ Grid', shortcut: 'E' },
  { key: 'milkyWay' as const, icon: Stars, label: 'Milky Way', shortcut: 'M' },
  { key: 'atmosphere' as const, icon: CloudSun, label: 'Sky', shortcut: 'A' },
  { key: 'cardinals' as const, icon: Compass, label: 'N/S/E/W', shortcut: '' },
] as const;

export function PlanetariumToolbar({ className = '' }: PlanetariumToolbarProps) {
  const { layers, toggleLayer, view, resetView } = usePlanetariumStore();

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 bg-nina-surface/90 backdrop-blur-sm rounded border border-nina-border ${className}`}
    >
      {layerButtons.map((btn) => {
        const Icon = btn.icon;
        const isActive = layers[btn.key];
        return (
          <button
            key={btn.key}
            onClick={() => toggleLayer(btn.key)}
            title={`${btn.label}${btn.shortcut ? ` (${btn.shortcut})` : ''}`}
            className={`p-1.5 rounded transition-colors ${
              isActive
                ? 'bg-nina-primary/30 text-nina-active'
                : 'text-nina-text-dim hover:text-nina-text hover:bg-nina-elevated'
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}

      <div className="w-px h-4 bg-nina-border mx-1" />

      {/* FOV indicator */}
      <div className="text-[10px] text-nina-text-dim font-mono px-1">
        {view.fov.toFixed(0)}°
      </div>

      {/* Reset view */}
      <button
        onClick={resetView}
        title="Reset view (Space)"
        className="p-1.5 rounded text-nina-text-dim hover:text-nina-text hover:bg-nina-elevated transition-colors"
      >
        <Maximize size={14} />
      </button>
    </div>
  );
}
