import { Star, Play, Square } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PanelChrome } from '../ui/PanelChrome';
import { useDeviceStore } from '../../stores/deviceStore';

export function GuideGraphPanel() {
  const { devices, guide, startGuiding, stopGuiding } = useDeviceStore();
  const mountConnected = devices.mount.status === 'connected';

  const scatterData = guide.corrections.slice(-50).map((c) => ({
    ra: Number(c.ra.toFixed(2)),
    dec: Number(c.dec.toFixed(2)),
  }));

  return (
    <PanelChrome
      title="Guide Graph"
      icon={<Star size={12} />}
      className="h-full"
      actions={
        <button
          onClick={guide.isGuiding ? stopGuiding : startGuiding}
          disabled={!mountConnected}
          className="p-0.5 rounded hover:bg-nina-surface transition-colors text-nina-text-dim hover:text-nina-text disabled:opacity-30"
          title={guide.isGuiding ? 'Stop Guiding' : 'Start Guiding'}
          data-tutorial="guide-button"
        >
          {guide.isGuiding ? <Square size={12} /> : <Play size={12} />}
        </button>
      }
    >
      <div className="space-y-2" data-tutorial="guide-panel">
        {/* RMS values */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <span className="text-nina-text-dim">RA RMS</span>
            <div className="text-nina-text-bright font-medium">{guide.rmsRA.toFixed(2)}"</div>
          </div>
          <div>
            <span className="text-nina-text-dim">Dec RMS</span>
            <div className="text-nina-text-bright font-medium">{guide.rmsDec.toFixed(2)}"</div>
          </div>
          <div>
            <span className="text-nina-text-dim">Total</span>
            <div className={`font-medium ${
              guide.totalRMS < 1 ? 'text-success' : guide.totalRMS < 2 ? 'text-warning' : 'text-error'
            }`}>
              {guide.totalRMS.toFixed(2)}"
            </div>
          </div>
        </div>

        {/* Scatter chart */}
        {scatterData.length > 1 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#37474F" />
                <XAxis
                  type="number"
                  dataKey="ra"
                  name="RA"
                  tick={{ fontSize: 9, fill: '#78909C' }}
                  domain={[-2, 2]}
                />
                <YAxis
                  type="number"
                  dataKey="dec"
                  name="Dec"
                  tick={{ fontSize: 9, fill: '#78909C' }}
                  domain={[-2, 2]}
                />
                <Tooltip
                  contentStyle={{ background: '#2A2C31', border: '1px solid #37474F', fontSize: 11 }}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Scatter data={scatterData} fill="#00BCA6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {!guide.isGuiding && scatterData.length === 0 && (
          <div className="text-xs text-nina-text-dim text-center py-2">
            Start guiding to see correction data
          </div>
        )}
      </div>
    </PanelChrome>
  );
}
