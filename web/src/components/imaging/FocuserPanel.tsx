import { Focus, Play, Square } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PanelChrome } from '../ui/PanelChrome';
import { useDeviceStore } from '../../stores/deviceStore';

export function FocuserPanel() {
  const { devices, focus, startFocus, stopFocus } = useDeviceStore();
  const focuserConnected = devices.focuser.status === 'connected';

  const chartData = focus.hfrValues.map((v) => ({
    position: v.position,
    hfr: Number(v.hfr.toFixed(2)),
  }));

  return (
    <PanelChrome
      title="Focuser"
      icon={<Focus size={12} />}
      className="h-full"
      actions={
        <button
          onClick={focus.isFocusing ? stopFocus : startFocus}
          disabled={!focuserConnected}
          className="p-0.5 rounded hover:bg-nina-surface transition-colors text-nina-text-dim hover:text-nina-text disabled:opacity-30"
          title={focus.isFocusing ? 'Stop Autofocus' : 'Start Autofocus'}
          data-tutorial="autofocus-button"
        >
          {focus.isFocusing ? <Square size={12} /> : <Play size={12} />}
        </button>
      }
    >
      <div className="space-y-2" data-tutorial="focuser-panel">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-nina-text-dim">Position</span>
            <div className="text-nina-text-bright font-medium">{focus.currentPosition}</div>
          </div>
          <div>
            <span className="text-nina-text-dim">Best</span>
            <div className="text-success font-medium">{focus.bestPosition ?? '--'}</div>
          </div>
          <div>
            <span className="text-nina-text-dim">Samples</span>
            <div className="text-nina-text-bright font-medium">{focus.hfrValues.length}</div>
          </div>
        </div>

        {/* V-curve chart */}
        {chartData.length > 1 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#37474F" />
                <XAxis dataKey="position" tick={{ fontSize: 9, fill: '#78909C' }} />
                <YAxis tick={{ fontSize: 9, fill: '#78909C' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#2A2C31', border: '1px solid #37474F', fontSize: 11 }}
                  labelStyle={{ color: '#BDC3C7' }}
                />
                <Line
                  type="monotone"
                  dataKey="hfr"
                  stroke="#00BCA6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#00BCA6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {focus.isFocusing && (
          <div className="text-xs text-warning animate-pulse text-center">Autofocus in progress...</div>
        )}
      </div>
    </PanelChrome>
  );
}
