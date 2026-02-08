// Context menu overlay for right-clicking on the sky
// Shows coordinates and actions like Slew Here / Center View

import { useEffect, useRef } from 'react';
import type { VisibleObject } from '../../api/client';
import { formatRA, formatDec } from '../../utils/celestialMath';

interface SkyContextMenuProps {
  x: number;
  y: number;
  ra: number;
  dec: number;
  nearbyObject?: VisibleObject | null;
  mountConnected: boolean;
  mountParked: boolean;
  onSlewTo: (ra: number, dec: number) => void;
  onCenterView: (ra: number, dec: number) => void;
  onSelectTarget?: (target: VisibleObject) => void;
  onClose: () => void;
}

export function SkyContextMenu({
  x,
  y,
  ra,
  dec,
  nearbyObject,
  mountConnected,
  mountParked,
  onSlewTo,
  onCenterView,
  onSelectTarget,
  onClose,
}: SkyContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();

    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('wheel', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('wheel', handleScroll);
    };
  }, [onClose]);

  // Keep menu within parent container
  useEffect(() => {
    if (!menuRef.current) return;
    const el = menuRef.current;
    const parent = el.offsetParent as HTMLElement;
    if (!parent) return;
    const parentW = parent.clientWidth;
    const parentH = parent.clientHeight;
    if (x + el.offsetWidth > parentW) {
      el.style.left = `${Math.max(0, x - el.offsetWidth)}px`;
    }
    if (y + el.offsetHeight > parentH) {
      el.style.top = `${Math.max(0, y - el.offsetHeight)}px`;
    }
  }, [x, y]);

  const canSlew = mountConnected && !mountParked;
  const slewRa = nearbyObject ? nearbyObject.object.ra : ra;
  const slewDec = nearbyObject ? nearbyObject.object.dec : dec;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[200px] rounded border border-nina-border bg-nina-surface shadow-lg"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Coordinate header */}
      <div className="px-3 py-2 border-b border-nina-border">
        <div className="text-[11px] text-nina-text-dim font-mono">
          RA {formatRA(ra)} / Dec {formatDec(dec)}
        </div>
        {nearbyObject && (
          <div className="text-xs text-nina-text mt-0.5 font-medium">
            {nearbyObject.object.name || nearbyObject.object.id}
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="py-1">
        {/* Slew action */}
        {canSlew && (
          <button
            className="w-full px-3 py-1.5 text-left text-xs text-nina-text hover:bg-nina-accent/20 hover:text-nina-accent flex items-center gap-2"
            onClick={() => {
              onSlewTo(slewRa, slewDec);
              onClose();
            }}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <line x1="8" y1="2" x2="8" y2="5" />
              <line x1="8" y1="11" x2="8" y2="14" />
              <line x1="2" y1="8" x2="5" y2="8" />
              <line x1="11" y1="8" x2="14" y2="8" />
            </svg>
            {nearbyObject
              ? `Slew to ${nearbyObject.object.name || nearbyObject.object.id}`
              : 'Slew Here'}
          </button>
        )}

        {/* Select nearby object */}
        {nearbyObject && onSelectTarget && (
          <button
            className="w-full px-3 py-1.5 text-left text-xs text-nina-text hover:bg-nina-accent/20 hover:text-nina-accent flex items-center gap-2"
            onClick={() => {
              onSelectTarget(nearbyObject);
              onClose();
            }}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="3" />
              <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
            </svg>
            Select {nearbyObject.object.name || nearbyObject.object.id}
          </button>
        )}

        {/* Center view */}
        <button
          className="w-full px-3 py-1.5 text-left text-xs text-nina-text hover:bg-nina-accent/20 hover:text-nina-accent flex items-center gap-2"
          onClick={() => {
            onCenterView(ra, dec);
            onClose();
          }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="10" height="10" rx="1" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
          Center View Here
        </button>

        {/* Disabled slew hint */}
        {mountConnected && mountParked && (
          <div className="px-3 py-1.5 text-[10px] text-nina-text-dim italic">
            Unpark mount to slew
          </div>
        )}
      </div>
    </div>
  );
}
