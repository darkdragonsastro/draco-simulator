// Settings page

import { useEffect, useState } from 'react';
import { MapPin, Cloud, Info, Palette, RotateCcw } from 'lucide-react';
import { useSkyStore } from '../stores/skyStore';
import { useThemeStore } from '../stores/themeStore';
import { PanelChrome } from '../components/ui/PanelChrome';
import { NightVisionToggle } from '../components/ui/NightVisionToggle';

export function Settings() {
  const { location, conditions, updateLocation, updateConditions, fetchLocation, fetchConditions } =
    useSkyStore();
  const { setSidebarExpanded } = useThemeStore();

  const [locationForm, setLocationForm] = useState({
    latitude: 0,
    longitude: 0,
    elevation: 0,
    name: '',
  });

  const [conditionsForm, setConditionsForm] = useState({
    seeing: 2.5,
    transparency: 0.8,
    cloud_cover: 0,
    bortle_class: 5,
    temperature: 15,
    humidity: 50,
    wind_speed: 5,
  });

  useEffect(() => {
    fetchLocation();
    fetchConditions();
  }, [fetchLocation, fetchConditions]);

  useEffect(() => {
    if (location) {
      setLocationForm({
        latitude: location.latitude,
        longitude: location.longitude,
        elevation: location.elevation,
        name: location.name || '',
      });
    }
  }, [location]);

  useEffect(() => {
    if (conditions) {
      setConditionsForm({
        seeing: conditions.seeing,
        transparency: conditions.transparency,
        cloud_cover: conditions.cloud_cover,
        bortle_class: conditions.bortle_class,
        temperature: conditions.temperature,
        humidity: conditions.humidity,
        wind_speed: conditions.wind_speed,
      });
    }
  }, [conditions]);

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateLocation(locationForm);
  };

  const handleConditionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateConditions(conditionsForm);
  };

  const handleResetLayout = () => {
    // Clear all panel layout saved state
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('react-resizable-panels:'));
    keys.forEach((k) => localStorage.removeItem(k));
    setSidebarExpanded(false);
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-nina-text-bright">Settings</h1>

      {/* Theme & Layout */}
      <PanelChrome title="Appearance" icon={<Palette size={12} />}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-nina-text-bright">Night Vision Mode</div>
              <div className="text-xs text-nina-text-dim">Switches all UI to red/black for dark adaptation</div>
            </div>
            <NightVisionToggle />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-nina-text-bright">Reset Layout</div>
              <div className="text-xs text-nina-text-dim">Reset all panel sizes and sidebar state</div>
            </div>
            <button
              onClick={handleResetLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-nina-elevated text-nina-text-dim rounded text-sm hover:text-nina-text hover:bg-nina-surface transition"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </PanelChrome>

      {/* Observer Location */}
      <PanelChrome title="Observer Location" icon={<MapPin size={12} />}>
        <form onSubmit={handleLocationSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-nina-text-dim mb-1">Latitude (-90 to 90)</label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={locationForm.latitude}
                onChange={(e) => setLocationForm({ ...locationForm, latitude: Number(e.target.value) })}
                className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
              />
            </div>
            <div>
              <label className="block text-xs text-nina-text-dim mb-1">Longitude (-180 to 180)</label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={locationForm.longitude}
                onChange={(e) => setLocationForm({ ...locationForm, longitude: Number(e.target.value) })}
                className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
              />
            </div>
            <div>
              <label className="block text-xs text-nina-text-dim mb-1">Elevation (meters)</label>
              <input
                type="number"
                step="1"
                value={locationForm.elevation}
                onChange={(e) => setLocationForm({ ...locationForm, elevation: Number(e.target.value) })}
                className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
              />
            </div>
            <div>
              <label className="block text-xs text-nina-text-dim mb-1">Location Name</label>
              <input
                type="text"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="e.g., Backyard Observatory"
                className="w-full bg-nina-bg border border-nina-border rounded px-2 py-1.5 text-sm text-nina-text"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-nina-primary rounded text-sm font-medium text-nina-text-bright hover:bg-nina-active transition"
          >
            Update Location
          </button>
        </form>
      </PanelChrome>

      {/* Sky Conditions */}
      <PanelChrome title="Sky Conditions (Simulation)" icon={<Cloud size={12} />}>
        <form onSubmit={handleConditionsSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SliderField
              label={`Seeing: ${conditionsForm.seeing.toFixed(1)}"`}
              min={0.5}
              max={5}
              step={0.1}
              value={conditionsForm.seeing}
              onChange={(v) => setConditionsForm({ ...conditionsForm, seeing: v })}
            />
            <SliderField
              label={`Transparency: ${Math.round(conditionsForm.transparency * 100)}%`}
              min={0}
              max={1}
              step={0.05}
              value={conditionsForm.transparency}
              onChange={(v) => setConditionsForm({ ...conditionsForm, transparency: v })}
            />
            <SliderField
              label={`Cloud Cover: ${Math.round(conditionsForm.cloud_cover * 100)}%`}
              min={0}
              max={1}
              step={0.05}
              value={conditionsForm.cloud_cover}
              onChange={(v) => setConditionsForm({ ...conditionsForm, cloud_cover: v })}
            />
            <SliderField
              label={`Bortle Class: ${conditionsForm.bortle_class}`}
              min={1}
              max={9}
              step={1}
              value={conditionsForm.bortle_class}
              onChange={(v) => setConditionsForm({ ...conditionsForm, bortle_class: v })}
            />
            <SliderField
              label={`Temperature: ${conditionsForm.temperature}°C`}
              min={-20}
              max={40}
              step={1}
              value={conditionsForm.temperature}
              onChange={(v) => setConditionsForm({ ...conditionsForm, temperature: v })}
            />
            <SliderField
              label={`Humidity: ${conditionsForm.humidity}%`}
              min={0}
              max={100}
              step={5}
              value={conditionsForm.humidity}
              onChange={(v) => setConditionsForm({ ...conditionsForm, humidity: v })}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-nina-primary rounded text-sm font-medium text-nina-text-bright hover:bg-nina-active transition"
          >
            Update Conditions
          </button>
        </form>
      </PanelChrome>

      {/* About */}
      <PanelChrome title="About" icon={<Info size={12} />}>
        <div className="space-y-1.5 text-xs text-nina-text-dim">
          <p><span className="text-nina-text">Draco Astrophotography Simulator</span></p>
          <p>Learn astrophotography through realistic simulation.</p>
          <p className="mt-2">Built with Go backend, React frontend, and real astronomical data.</p>
        </div>
      </PanelChrome>
    </div>
  );
}

function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-nina-text-dim mb-1">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
