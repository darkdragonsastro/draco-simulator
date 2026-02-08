// Imaging page - resizable panel-based cockpit

import { useEffect } from 'react';
import { Panel, Group } from 'react-resizable-panels';
import { ResizeHandle } from '../components/ui/ResizeHandle';
import { ImageViewerPanel } from '../components/imaging/ImageViewerPanel';
import { CaptureControlPanel } from '../components/imaging/CaptureControlPanel';
import { EquipmentStatusPanel } from '../components/imaging/EquipmentStatusPanel';
import { FocuserPanel } from '../components/imaging/FocuserPanel';
import { GuideGraphPanel } from '../components/imaging/GuideGraphPanel';
import { HFRHistoryPanel } from '../components/imaging/HFRHistoryPanel';
import { ImageHistoryPanel } from '../components/imaging/ImageHistoryPanel';
import { useDeviceStore } from '../stores/deviceStore';

export function Imaging() {
  const { devices, connectDevice } = useDeviceStore();

  // Auto-connect devices on mount
  useEffect(() => {
    if (devices.camera.status === 'disconnected') connectDevice('camera');
    if (devices.mount.status === 'disconnected') connectDevice('mount');
    if (devices.focuser.status === 'disconnected') connectDevice('focuser');
  }, []);

  return (
    <div className="h-full">
      <Group orientation="vertical" id="imaging-main">
        {/* Top row */}
        <Panel defaultSize={70} minSize={40}>
          <Group orientation="horizontal" id="imaging-top">
            {/* Image viewer - left */}
            <Panel defaultSize={60} minSize={30}>
              <ImageViewerPanel />
            </Panel>

            <ResizeHandle />

            {/* Right sidebar panels */}
            <Panel defaultSize={40} minSize={25}>
              <Group orientation="vertical" id="imaging-right">
                <Panel defaultSize={35} minSize={15}>
                  <CaptureControlPanel />
                </Panel>
                <ResizeHandle direction="vertical" />
                <Panel defaultSize={30} minSize={10}>
                  <EquipmentStatusPanel />
                </Panel>
                <ResizeHandle direction="vertical" />
                <Panel defaultSize={35} minSize={15}>
                  <FocuserPanel />
                </Panel>
              </Group>
            </Panel>
          </Group>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* Bottom row */}
        <Panel defaultSize={30} minSize={15}>
          <Group orientation="horizontal" id="imaging-bottom">
            <Panel defaultSize={40} minSize={20}>
              <GuideGraphPanel />
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={30} minSize={15}>
              <HFRHistoryPanel />
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={30} minSize={15}>
              <ImageHistoryPanel />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}
