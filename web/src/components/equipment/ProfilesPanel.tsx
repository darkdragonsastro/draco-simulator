import { useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { deviceApi } from '../../api/client';
import type {
  EquipmentProfile,
  DeviceProfile,
  DiscoveredDevice,
  ConnectionType,
} from '../../api/client';
import { PanelChrome } from '../ui/PanelChrome';

export function ProfilesPanel() {
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<EquipmentProfile | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [newProfile, setNewProfile] = useState<Partial<EquipmentProfile>>({
    name: '',
    description: '',
    mode: 'simulation',
    devices: [],
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await deviceApi.listProfiles();
      setProfiles(response.profiles);
      const active = await deviceApi.getActiveProfile();
      setActiveProfile(active);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    }
  };

  const handleActivateProfile = async (id: string) => {
    try {
      const profile = await deviceApi.setActiveProfile(id);
      setActiveProfile(profile);
    } catch (error) {
      console.error('Failed to activate profile:', error);
    }
  };

  const handleDiscoverAll = async () => {
    setIsDiscovering(true);
    try {
      const result = await deviceApi.discoverAll();
      setDiscoveredDevices(result.devices);
    } catch (error) {
      console.error('Failed to discover devices:', error);
    }
    setIsDiscovering(false);
  };

  const handleCreateProfile = async () => {
    if (!newProfile.name) return;
    try {
      const profile = await deviceApi.createProfile({
        ...newProfile,
        id: `profile-${Date.now()}`,
        is_default: profiles.length === 0,
      } as EquipmentProfile);
      setProfiles([...profiles, profile]);
      setShowWizard(false);
      setNewProfile({ name: '', description: '', mode: 'simulation', devices: [] });
      setWizardStep(0);
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const addDeviceToProfile = (device: DiscoveredDevice) => {
    const deviceProfile: DeviceProfile = {
      id: device.id,
      name: device.name,
      device_type: device.device_type,
      connection_type: device.connection_type,
      connection_config: {
        server_address: device.server_address,
        device_name: device.device_name,
        device_number: device.device_number,
      },
      enabled: true,
    };
    setNewProfile({
      ...newProfile,
      devices: [...(newProfile.devices || []), deviceProfile],
    });
  };

  const removeDeviceFromProfile = (deviceId: string) => {
    setNewProfile({
      ...newProfile,
      devices: (newProfile.devices || []).filter((d) => d.id !== deviceId),
    });
  };

  const getConnectionBadge = (type: ConnectionType) => {
    const colors: Record<ConnectionType, string> = {
      virtual: 'bg-nebula-purple/20 text-nebula-purple',
      indi: 'bg-nebula-blue/20 text-nebula-blue',
      alpaca: 'bg-success/20 text-success',
    };
    return <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[type]}`}>{type}</span>;
  };

  return (
    <div className="space-y-3">
      {/* Active Profile */}
      {activeProfile && (
        <div className={`p-3 rounded border ${
          activeProfile.mode === 'simulation' ? 'bg-nebula-purple/10 border-nebula-purple/30' :
          activeProfile.mode === 'live' ? 'bg-success/10 border-success/30' :
          'bg-warning/10 border-warning/30'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-nina-text-bright">
              {activeProfile.mode === 'simulation' ? 'Simulation Mode' :
               activeProfile.mode === 'live' ? 'Live Mode' : 'Hybrid Mode'}
            </span>
            <span className="text-xs text-nina-text-dim">— {activeProfile.name}</span>
          </div>
        </div>
      )}

      {/* Profile list */}
      <PanelChrome
        title="Equipment Profiles"
        actions={
          <button
            onClick={() => setShowWizard(true)}
            className="p-0.5 rounded hover:bg-nina-surface transition-colors text-nina-text-dim hover:text-nina-text"
            title="New Profile"
          >
            <Plus size={12} />
          </button>
        }
      >
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`p-3 rounded border transition-colors ${
                activeProfile?.id === profile.id
                  ? 'bg-nina-primary/10 border-nina-active'
                  : 'bg-nina-elevated border-nina-border hover:border-nina-text-dim'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-nina-text-bright">{profile.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  profile.mode === 'simulation' ? 'bg-nebula-purple/20 text-nebula-purple' :
                  profile.mode === 'live' ? 'bg-success/20 text-success' :
                  'bg-warning/20 text-warning'
                }`}>
                  {profile.mode}
                </span>
              </div>
              {profile.description && (
                <p className="text-xs text-nina-text-dim mb-2">{profile.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mb-2">
                {profile.devices.map((d) => (
                  <span key={d.id} className="text-[10px] bg-nina-surface px-1.5 py-0.5 rounded text-nina-text-dim">
                    {d.name} {getConnectionBadge(d.connection_type)}
                  </span>
                ))}
              </div>
              {activeProfile?.id !== profile.id ? (
                <button
                  onClick={() => handleActivateProfile(profile.id)}
                  className="text-xs px-2 py-1 bg-nina-primary/20 text-nina-active rounded hover:bg-nina-primary/30 transition"
                >
                  Activate
                </button>
              ) : (
                <div className="flex items-center gap-1 text-xs text-success">
                  <Check size={12} /> Active
                </div>
              )}
            </div>
          ))}
          {profiles.length === 0 && (
            <div className="text-sm text-nina-text-dim text-center py-4">
              No profiles yet. Create one to get started.
            </div>
          )}
        </div>
      </PanelChrome>

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-nina-surface rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden border border-nina-border">
            <div className="px-4 py-3 bg-nina-elevated border-b border-nina-border">
              <h2 className="text-sm font-medium text-nina-text-bright">Create Equipment Profile</h2>
              <p className="text-xs text-nina-text-dim">Step {wizardStep + 1} of 3</p>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {wizardStep === 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-nina-text-dim mb-1">Profile Name</label>
                    <input
                      type="text"
                      value={newProfile.name || ''}
                      onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                      placeholder="My Observatory"
                      className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-nina-text-dim mb-1">Description</label>
                    <textarea
                      value={newProfile.description || ''}
                      onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                      placeholder="Optional description..."
                      className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text h-16"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-nina-text-dim mb-1">Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['simulation', 'live', 'hybrid'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setNewProfile({ ...newProfile, mode })}
                          className={`p-2 rounded text-center text-sm transition ${
                            newProfile.mode === mode
                              ? 'bg-nina-primary text-nina-text-bright'
                              : 'bg-nina-elevated text-nina-text-dim hover:bg-nina-bg'
                          }`}
                        >
                          <div className="capitalize">{mode}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-3">
                  {(newProfile.devices?.length ?? 0) > 0 && (
                    <div>
                      <div className="text-xs text-nina-text-dim mb-1">Devices in profile:</div>
                      <div className="space-y-1">
                        {newProfile.devices?.map((device) => (
                          <div key={device.id} className="flex items-center justify-between p-2 bg-nina-elevated rounded">
                            <span className="text-sm text-nina-text">{device.name} {getConnectionBadge(device.connection_type)}</span>
                            <button
                              onClick={() => removeDeviceFromProfile(device.id)}
                              className="text-xs text-error hover:text-red-400"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleDiscoverAll}
                    disabled={isDiscovering}
                    className="px-3 py-1.5 bg-nina-primary rounded text-sm text-nina-text-bright hover:bg-nina-active transition disabled:opacity-50"
                  >
                    {isDiscovering ? 'Scanning...' : 'Discover Devices'}
                  </button>
                  {discoveredDevices.length > 0 && (
                    <div className="space-y-1">
                      {discoveredDevices.map((device) => {
                        const added = newProfile.devices?.some((d) => d.id === device.id);
                        return (
                          <div key={device.id} className="flex items-center justify-between p-2 bg-nina-elevated rounded">
                            <span className="text-sm text-nina-text">{device.name} {getConnectionBadge(device.connection_type)}</span>
                            <button
                              onClick={() => addDeviceToProfile(device)}
                              disabled={added}
                              className={`text-xs px-2 py-1 rounded transition ${
                                added ? 'text-nina-text-dim' : 'bg-nina-primary/20 text-nina-active hover:bg-nina-primary/30'
                              }`}
                            >
                              {added ? 'Added' : 'Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div className="bg-nina-elevated rounded p-3 text-sm space-y-2">
                    <div><span className="text-nina-text-dim">Name:</span> <span className="text-nina-text-bright">{newProfile.name}</span></div>
                    <div><span className="text-nina-text-dim">Mode:</span> <span className="text-nina-text-bright capitalize">{newProfile.mode}</span></div>
                    <div>
                      <span className="text-nina-text-dim">Devices:</span>
                      {newProfile.devices?.map((d) => (
                        <div key={d.id} className="ml-2 text-nina-text">{d.name} {getConnectionBadge(d.connection_type)}</div>
                      ))}
                      {(!newProfile.devices || newProfile.devices.length === 0) && (
                        <span className="text-nina-text-dim ml-2">No devices</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-nina-elevated border-t border-nina-border flex justify-between">
              <button
                onClick={() => wizardStep === 0 ? setShowWizard(false) : setWizardStep(wizardStep - 1)}
                className="px-3 py-1.5 text-sm text-nina-text-dim hover:text-nina-text transition"
              >
                {wizardStep === 0 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => wizardStep === 2 ? handleCreateProfile() : setWizardStep(wizardStep + 1)}
                disabled={wizardStep === 0 && !newProfile.name}
                className="px-4 py-1.5 bg-nina-primary rounded text-sm font-medium text-nina-text-bright hover:bg-nina-active transition disabled:opacity-50"
              >
                {wizardStep === 2 ? 'Create Profile' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
