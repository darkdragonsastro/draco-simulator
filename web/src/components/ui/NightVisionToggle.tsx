import { Eye, EyeOff } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export function NightVisionToggle() {
  const { nightVision, toggleNightVision } = useThemeStore();

  return (
    <button
      onClick={toggleNightVision}
      className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
        nightVision
          ? 'bg-error/20 text-error'
          : 'bg-nina-elevated text-nina-text-dim hover:text-nina-text hover:bg-nina-surface'
      }`}
      title={nightVision ? 'Disable Night Vision' : 'Enable Night Vision'}
    >
      {nightVision ? <EyeOff size={16} /> : <Eye size={16} />}
      <span>{nightVision ? 'Night Vision On' : 'Night Vision Off'}</span>
    </button>
  );
}
