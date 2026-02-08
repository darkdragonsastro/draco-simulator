import { PanelChrome } from '../ui/PanelChrome';
import { RotateCw } from 'lucide-react';

export function RotatorPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2 bg-nina-elevated border border-nina-border rounded">
        <select
          className="flex-1 bg-nina-surface border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
          defaultValue="none"
        >
          <option value="none">No Rotator</option>
        </select>
      </div>

      <PanelChrome title="Rotator" icon={<RotateCw size={12} />}>
        <div className="text-nina-text-dim text-sm py-4 text-center">
          No rotator configured. Add one from your equipment profile.
        </div>
      </PanelChrome>
    </div>
  );
}
