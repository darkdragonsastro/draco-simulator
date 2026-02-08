import { clsx } from 'clsx';

export function PanelChrome({
  title,
  icon,
  actions,
  children,
  className,
  noPad,
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  return (
    <div className={clsx('flex flex-col bg-nina-surface border border-nina-border rounded', className)}>
      <div className="flex items-center justify-between h-7 px-2 bg-nina-elevated border-b border-nina-border rounded-t shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-nina-text-dim uppercase tracking-wide">
          {icon}
          {title}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      <div className={clsx('flex-1 overflow-auto', !noPad && 'p-3')}>
        {children}
      </div>
    </div>
  );
}
