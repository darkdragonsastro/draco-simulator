// Equipment Setup page - manage device profiles and connections

import { useState, useEffect } from 'react';
import { deviceApi } from '../api/client';
import type {
  EquipmentProfile,
  DeviceProfile,
  DiscoveredDevice,
  ConnectionType,
  DeviceType,
} from '../api/client';

export function Equipment() {
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
  const [indiServer, setIndiServer] = useState('localhost:7624');
  const [alpacaServer, setAlpacaServer] = useState('http://localhost:11111');

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

  const handleDiscoverINDI = async () => {
    setIsDiscovering(true);
    try {
      const result = await deviceApi.discoverINDI(indiServer);
      setDiscoveredDevices(result.devices);
    } catch (error) {
      console.error('Failed to discover INDI devices:', error);
    }
    setIsDiscovering(false);
  };

  const handleDiscoverAlpaca = async () => {
    setIsDiscovering(true);
    try {
      const result = await deviceApi.discoverAlpaca(alpacaServer);
      setDiscoveredDevices(result.devices);
    } catch (error) {
      console.error('Failed to discover Alpaca devices:', error);
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

  const getDeviceTypeIcon = (type: DeviceType) => {
    switch (type) {
      case 'camera': return '📷';
      case 'mount': return '🔭';
      case 'focuser': return '🎯';
      case 'filter_wheel': return '🎨';
      case 'guider': return '⭐';
      case 'rotator': return '🔄';
      case 'dome': return '🏠';
      case 'weather': return '🌤️';
      default: return '📦';
    }
  };

  const getConnectionBadge = (type: ConnectionType) => {
    switch (type) {
      case 'virtual':
        return <span className="text-xs px-2 py-0.5 rounded bg-nebula-purple/20 text-nebula-purple">Virtual</span>;
      case 'indi':
        return <span className="text-xs px-2 py-0.5 rounded bg-nebula-blue/20 text-nebula-blue">INDI</span>;
      case 'alpaca':
        return <span className="text-xs px-2 py-0.5 rounded bg-success/20 text-success">Alpaca</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipment Setup</h1>
          <p className="text-gray-400">Manage your device profiles and connections</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-nebula-purple rounded-lg font-medium hover:bg-opacity-80 transition"
        >
          + New Profile
        </button>
      </div>

      {/* Mode Indicator */}
      {activeProfile && (
        <div className={`mb-6 p-4 rounded-xl ${
          activeProfile.mode === 'simulation' ? 'bg-nebula-purple/20 border border-nebula-purple/50' :
          activeProfile.mode === 'live' ? 'bg-success/20 border border-success/50' :
          'bg-warning/20 border border-warning/50'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {activeProfile.mode === 'simulation' ? '🎮' : activeProfile.mode === 'live' ? '🔭' : '🔀'}
            </span>
            <div>
              <div className="font-medium text-white">
                {activeProfile.mode === 'simulation' ? 'Simulation Mode' :
                 activeProfile.mode === 'live' ? 'Live Mode' : 'Hybrid Mode'}
              </div>
              <div className="text-sm text-gray-400">
                Active profile: {activeProfile.name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profiles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`bg-space-800 rounded-xl p-5 border-2 ${
              activeProfile?.id === profile.id ? 'border-nebula-blue' : 'border-transparent'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{profile.name}</h3>
                {profile.description && (
                  <p className="text-sm text-gray-400">{profile.description}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                profile.mode === 'simulation' ? 'bg-nebula-purple/20 text-nebula-purple' :
                profile.mode === 'live' ? 'bg-success/20 text-success' :
                'bg-warning/20 text-warning'
              }`}>
                {profile.mode}
              </span>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">Devices ({profile.devices.length})</div>
              <div className="flex flex-wrap gap-2">
                {profile.devices.map((device) => (
                  <div key={device.id} className="flex items-center gap-1 px-2 py-1 bg-space-700 rounded text-xs">
                    <span>{getDeviceTypeIcon(device.device_type)}</span>
                    <span className="text-gray-300">{device.name}</span>
                    {getConnectionBadge(device.connection_type)}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {activeProfile?.id !== profile.id && (
                <button
                  onClick={() => handleActivateProfile(profile.id)}
                  className="flex-1 py-2 bg-nebula-blue/20 text-nebula-blue rounded-lg text-sm hover:bg-nebula-blue/30 transition"
                >
                  Activate
                </button>
              )}
              {activeProfile?.id === profile.id && (
                <span className="flex-1 py-2 text-center text-success text-sm">
                  ✓ Active
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Device Discovery */}
      <div className="bg-space-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Device Discovery</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Auto Discovery */}
          <div className="bg-space-700 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Auto Discovery</h3>
            <p className="text-sm text-gray-400 mb-3">Scan for all available devices</p>
            <button
              onClick={handleDiscoverAll}
              disabled={isDiscovering}
              className="w-full py-2 bg-nebula-purple rounded-lg text-sm hover:bg-opacity-80 transition disabled:opacity-50"
            >
              {isDiscovering ? 'Scanning...' : 'Scan All'}
            </button>
          </div>

          {/* INDI Discovery */}
          <div className="bg-space-700 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">INDI Server</h3>
            <input
              type="text"
              value={indiServer}
              onChange={(e) => setIndiServer(e.target.value)}
              placeholder="localhost:7624"
              className="w-full bg-space-600 border border-space-500 rounded px-3 py-2 text-sm text-white mb-2"
            />
            <button
              onClick={handleDiscoverINDI}
              disabled={isDiscovering}
              className="w-full py-2 bg-nebula-blue rounded-lg text-sm hover:bg-opacity-80 transition disabled:opacity-50"
            >
              Connect INDI
            </button>
          </div>

          {/* Alpaca Discovery */}
          <div className="bg-space-700 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">ASCOM Alpaca</h3>
            <input
              type="text"
              value={alpacaServer}
              onChange={(e) => setAlpacaServer(e.target.value)}
              placeholder="http://localhost:11111"
              className="w-full bg-space-600 border border-space-500 rounded px-3 py-2 text-sm text-white mb-2"
            />
            <button
              onClick={handleDiscoverAlpaca}
              disabled={isDiscovering}
              className="w-full py-2 bg-success rounded-lg text-sm hover:bg-opacity-80 transition disabled:opacity-50"
            >
              Connect Alpaca
            </button>
          </div>
        </div>

        {/* Discovered Devices */}
        {discoveredDevices.length > 0 && (
          <div>
            <h3 className="font-medium text-white mb-3">Discovered Devices</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discoveredDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-space-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getDeviceTypeIcon(device.device_type)}</span>
                    <div>
                      <div className="font-medium text-white">{device.name}</div>
                      <div className="text-xs text-gray-400">
                        {device.server_address} {getConnectionBadge(device.connection_type)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => addDeviceToProfile(device)}
                    className="px-3 py-1 bg-nebula-blue/20 text-nebula-blue rounded text-sm hover:bg-nebula-blue/30 transition"
                  >
                    Add to Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Creation Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-space-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 bg-space-700 border-b border-space-600">
              <h2 className="text-xl font-semibold text-white">Create Equipment Profile</h2>
              <p className="text-sm text-gray-400">Step {wizardStep + 1} of 3</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Profile Details</h3>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Profile Name</label>
                    <input
                      type="text"
                      value={newProfile.name || ''}
                      onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                      placeholder="My Observatory"
                      className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                    <textarea
                      value={newProfile.description || ''}
                      onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                      placeholder="Optional description..."
                      className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white h-20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['simulation', 'live', 'hybrid'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setNewProfile({ ...newProfile, mode })}
                          className={`p-3 rounded-lg text-center transition ${
                            newProfile.mode === mode
                              ? 'bg-nebula-purple text-white'
                              : 'bg-space-700 text-gray-400 hover:bg-space-600'
                          }`}
                        >
                          <div className="text-2xl mb-1">
                            {mode === 'simulation' ? '🎮' : mode === 'live' ? '🔭' : '🔀'}
                          </div>
                          <div className="text-sm capitalize">{mode}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Add Devices</h3>
                  <p className="text-sm text-gray-400">
                    Add devices from discovery or configure manually.
                  </p>

                  {/* Current devices in profile */}
                  {(newProfile.devices?.length ?? 0) > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-2">Devices in profile:</div>
                      <div className="space-y-2">
                        {newProfile.devices?.map((device) => (
                          <div key={device.id} className="flex items-center justify-between p-3 bg-space-700 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span>{getDeviceTypeIcon(device.device_type)}</span>
                              <span className="text-white">{device.name}</span>
                              {getConnectionBadge(device.connection_type)}
                            </div>
                            <button
                              onClick={() => removeDeviceFromProfile(device.id)}
                              className="text-error hover:text-red-400"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discovery section */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDiscoverAll}
                      disabled={isDiscovering}
                      className="px-4 py-2 bg-nebula-purple rounded-lg text-sm hover:bg-opacity-80 transition disabled:opacity-50"
                    >
                      {isDiscovering ? 'Scanning...' : 'Discover Devices'}
                    </button>
                  </div>

                  {/* Discovered devices */}
                  {discoveredDevices.length > 0 && (
                    <div className="space-y-2">
                      {discoveredDevices.map((device) => {
                        const alreadyAdded = newProfile.devices?.some((d) => d.id === device.id);
                        return (
                          <div key={device.id} className="flex items-center justify-between p-3 bg-space-700 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span>{getDeviceTypeIcon(device.device_type)}</span>
                              <span className="text-white">{device.name}</span>
                              {getConnectionBadge(device.connection_type)}
                            </div>
                            <button
                              onClick={() => addDeviceToProfile(device)}
                              disabled={alreadyAdded}
                              className={`px-3 py-1 rounded text-sm transition ${
                                alreadyAdded
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-nebula-blue/20 text-nebula-blue hover:bg-nebula-blue/30'
                              }`}
                            >
                              {alreadyAdded ? 'Added' : 'Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Review & Create</h3>

                  <div className="bg-space-700 rounded-lg p-4">
                    <div className="mb-3">
                      <span className="text-gray-400">Name:</span>
                      <span className="ml-2 text-white">{newProfile.name}</span>
                    </div>
                    <div className="mb-3">
                      <span className="text-gray-400">Mode:</span>
                      <span className="ml-2 text-white capitalize">{newProfile.mode}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Devices:</span>
                      <div className="mt-2 space-y-1">
                        {newProfile.devices?.map((device) => (
                          <div key={device.id} className="flex items-center gap-2 text-sm">
                            <span>{getDeviceTypeIcon(device.device_type)}</span>
                            <span className="text-white">{device.name}</span>
                            {getConnectionBadge(device.connection_type)}
                          </div>
                        ))}
                        {(!newProfile.devices || newProfile.devices.length === 0) && (
                          <span className="text-gray-500">No devices configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-space-700 border-t border-space-600 flex justify-between">
              <button
                onClick={() => {
                  if (wizardStep === 0) {
                    setShowWizard(false);
                  } else {
                    setWizardStep(wizardStep - 1);
                  }
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                {wizardStep === 0 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => {
                  if (wizardStep === 2) {
                    handleCreateProfile();
                  } else {
                    setWizardStep(wizardStep + 1);
                  }
                }}
                disabled={wizardStep === 0 && !newProfile.name}
                className="px-6 py-2 bg-nebula-purple rounded-lg font-medium hover:bg-opacity-80 transition disabled:opacity-50"
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
