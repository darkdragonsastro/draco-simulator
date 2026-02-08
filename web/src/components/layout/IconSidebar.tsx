import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Camera,
  Target,
  ShoppingCart,
  TrendingUp,
  Telescope,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Star,
  Coins,
  Globe2,
} from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { useGameStore } from '../../stores/gameStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import { useDeviceStore } from '../../stores/deviceStore';
import { DeviceStatusDot } from '../ui/DeviceStatusDot';
import { ProgressRing } from '../ui/ProgressRing';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/sky', label: 'Sky View', icon: Globe2 },
  { path: '/imaging', label: 'Imaging', icon: Camera },
  { path: '/equipment', label: 'Equipment', icon: Telescope },
  { path: '/challenges', label: 'Challenges', icon: Target },
  { path: '/store', label: 'Store', icon: ShoppingCart },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const tutorials = [
  { key: 'firstLight', id: 'first-light', label: 'First Light', icon: Camera },
  { key: 'autofocus', id: 'autofocus', label: 'Autofocus', icon: Target },
  { key: 'guiding', id: 'guiding', label: 'Guiding', icon: Star },
] as const;

export function IconSidebar() {
  const location = useLocation();
  const { sidebarExpanded, toggleSidebar } = useThemeStore();
  const { progress } = useGameStore();
  const { startTutorial, isCompleted } = useTutorialStore();
  const { devices } = useDeviceStore();

  const w = sidebarExpanded ? 'w-[200px]' : 'w-[50px]';

  return (
    <nav
      className={clsx(
        'flex flex-col bg-nina-surface border-r border-nina-border transition-all duration-200 shrink-0',
        w
      )}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-8 hover:bg-nina-elevated transition-colors text-nina-text-dim"
      >
        {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Navigation */}
      <div className="flex-1 flex flex-col gap-0.5 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={clsx(
                'flex items-center gap-2 rounded px-2 py-2 transition-colors',
                isActive
                  ? 'bg-nina-primary text-nina-text-bright'
                  : 'text-nina-text-dim hover:text-nina-text-bright hover:bg-nina-elevated'
              )}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarExpanded && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Device status dots */}
        <div className={clsx('mt-3 pt-3 border-t border-nina-border', sidebarExpanded ? 'px-2' : 'px-1')}>
          {sidebarExpanded && (
            <div className="text-[10px] font-medium text-nina-text-dim uppercase tracking-wide mb-2">
              Devices
            </div>
          )}
          <div className={clsx('flex flex-wrap gap-1.5', !sidebarExpanded && 'flex-col items-center')}>
            {(['camera', 'mount', 'focuser', 'filter_wheel', 'guider'] as const).map((d) => (
              <div key={d} className="flex items-center gap-1.5" title={`${devices[d].name} (${devices[d].status})`}>
                <DeviceStatusDot status={devices[d].status} />
                {sidebarExpanded && (
                  <span className="text-[10px] text-nina-text-dim capitalize">
                    {d === 'filter_wheel' ? 'FW' : d}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tutorials */}
        {sidebarExpanded && (
          <div className="mt-3 pt-3 border-t border-nina-border">
            <div className="text-[10px] font-medium text-nina-text-dim uppercase tracking-wide mb-2 px-2">
              Tutorials
            </div>
            {tutorials.map((t) => {
              const done = isCompleted(t.id);
              return (
                <button
                  key={t.key}
                  onClick={() => startTutorial(t.key)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors',
                    done ? 'text-nina-text-dim' : 'text-nina-text hover:bg-nina-elevated'
                  )}
                >
                  <BookOpen size={12} />
                  <span className="truncate">{t.label}</span>
                  {done && <span className="ml-auto text-success text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Gamification summary at bottom */}
      {progress && (
        <div className={clsx('border-t border-nina-border p-2', sidebarExpanded ? 'space-y-2' : 'flex flex-col items-center gap-2')}>
          <div className="flex items-center gap-1.5" title={`Level ${progress.level}`}>
            <ProgressRing value={progress.xp} max={progress.xp_to_next_level} size={sidebarExpanded ? 28 : 24}>
              <span className="text-[8px] font-bold text-nina-text-bright">{progress.level}</span>
            </ProgressRing>
            {sidebarExpanded && (
              <div className="text-[10px]">
                <div className="text-nina-text-bright font-medium">Lvl {progress.level}</div>
                <div className="text-nina-text-dim">{progress.xp}/{progress.xp_to_next_level} XP</div>
              </div>
            )}
          </div>
          {sidebarExpanded && (
            <div className="flex items-center gap-1 text-[10px]">
              <Coins size={10} className="text-star-gold" />
              <span className="text-star-gold font-medium">{progress.credits.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
