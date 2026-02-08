import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

export function StatBadge({
  icon: Icon,
  label,
  value,
  color = 'text-nina-text',
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-1.5 text-xs', className)}>
      {Icon && <Icon size={12} className={color} />}
      <span className="text-nina-text-dim">{label}</span>
      <span className={clsx('font-medium', color)}>{value}</span>
    </div>
  );
}
