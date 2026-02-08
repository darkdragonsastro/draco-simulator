import { TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PanelChrome } from '../ui/PanelChrome';
import { useDeviceStore } from '../../stores/deviceStore';

export function HFRHistoryPanel() {
  const { captureHistory } = useDeviceStore();

  const chartData = captureHistory
    .slice(0, 20)
    .reverse()
    .map((img, i) => ({
      frame: i + 1,
      hfr: img.hfr ? Number(img.hfr.toFixed(2)) : null,
    }))
    .filter((d) => d.hfr !== null);

  return (
    <PanelChrome title="HFR History" icon={<TrendingDown size={12} />} className="h-full">
      {chartData.length > 1 ? (
        <div className="h-full min-h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#37474F" />
              <XAxis dataKey="frame" tick={{ fontSize: 9, fill: '#78909C' }} />
              <YAxis tick={{ fontSize: 9, fill: '#78909C' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#2A2C31', border: '1px solid #37474F', fontSize: 11 }}
                labelStyle={{ color: '#BDC3C7' }}
              />
              <Line
                type="monotone"
                dataKey="hfr"
                stroke="#4dabf7"
                strokeWidth={2}
                dot={{ r: 2, fill: '#4dabf7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-xs text-nina-text-dim text-center py-4">
          Capture more images to see HFR trend
        </div>
      )}
    </PanelChrome>
  );
}
