// Full-screen Planetarium page

import { useEffect, useState, useCallback } from 'react';
import { Planetarium } from '../components/planetarium/Planetarium';
import { useSkyStore } from '../stores/skyStore';
import { useMountStore } from '../stores/mountStore';
import { skyApi } from '../api/client';
import type { SkyTime } from '../api/client';

export function SkyView() {
  const {
    visibleObjects,
    moon,
    sun,
    selectedTarget,
    fetchAllSkyData,
    selectTarget,
  } = useSkyStore();
  const { status } = useMountStore();
  const [skyTime, setSkyTime] = useState<SkyTime | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    fetchAllSkyData();
    skyApi.getTime().then(setSkyTime).catch(() => {});

    // Refresh periodically
    const interval = setInterval(() => {
      skyApi.getTime().then(setSkyTime).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAllSkyData]);

  // Resize handler
  const updateSize = useCallback(() => {
    const el = document.getElementById('planetarium-container');
    if (el) {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    }
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateSize]);

  const handleSlewToTarget = status.connected && !status.is_parked
    ? async (ra: number, dec: number) => {
        const { mountApi } = await import('../api/client');
        mountApi.slewTo(ra, dec);
      }
    : undefined;

  return (
    <div id="planetarium-container" className="w-full h-full">
      <Planetarium
        visibleObjects={visibleObjects}
        moon={moon}
        sun={sun}
        selectedTarget={selectedTarget}
        onSelectTarget={selectTarget}
        width={size.width}
        height={size.height}
        mountAlt={status.connected ? status.alt : undefined}
        mountAz={status.connected ? status.az : undefined}
        isSlewing={status.is_slewing}
        showReticle={status.connected}
        onSlewToTarget={handleSlewToTarget}
        lst={skyTime?.lst ?? 0}
        latitude={34.0522}
        showToolbar={true}
      />
    </div>
  );
}
