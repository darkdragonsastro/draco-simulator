// Equipment Setup page - NINA-style device sub-tabs + connector bars

import { useState } from 'react';
import { DeviceSubTabs, type EquipmentTab } from '../components/equipment/DeviceSubTabs';
import { CameraPanel } from '../components/equipment/CameraPanel';
import { MountPanel } from '../components/equipment/MountPanel';
import { FocuserConfigPanel } from '../components/equipment/FocuserConfigPanel';
import { FilterWheelPanel } from '../components/equipment/FilterWheelPanel';
import { GuiderConfigPanel } from '../components/equipment/GuiderConfigPanel';
import { RotatorPanel } from '../components/equipment/RotatorPanel';
import { ProfilesPanel } from '../components/equipment/ProfilesPanel';

const panels: Record<EquipmentTab, React.ComponentType> = {
  camera: CameraPanel,
  filter_wheel: FilterWheelPanel,
  focuser: FocuserConfigPanel,
  mount: MountPanel,
  guider: GuiderConfigPanel,
  rotator: RotatorPanel,
  profiles: ProfilesPanel,
};

export function Equipment() {
  const [activeTab, setActiveTab] = useState<EquipmentTab>('camera');
  const Panel = panels[activeTab];

  return (
    <div className="h-full flex rounded overflow-hidden border border-nina-border">
      <DeviceSubTabs active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 overflow-auto p-4">
        <Panel />
      </div>
    </div>
  );
}
