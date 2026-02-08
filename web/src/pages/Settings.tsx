// Settings page

import { useEffect, useState } from 'react';
import { useSkyStore } from '../stores/skyStore';

export function Settings() {
  const { location, conditions, updateLocation, updateConditions, fetchLocation, fetchConditions } =
    useSkyStore();

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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Observer Location */}
        <section className="bg-space-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Observer Location</h2>
          <form onSubmit={handleLocationSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Latitude (-90 to 90)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={locationForm.latitude}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, latitude: Number(e.target.value) })
                  }
                  className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Longitude (-180 to 180)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={locationForm.longitude}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, longitude: Number(e.target.value) })
                  }
                  className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Elevation (meters)</label>
                <input
                  type="number"
                  step="1"
                  value={locationForm.elevation}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, elevation: Number(e.target.value) })
                  }
                  className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location Name</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  placeholder="e.g., Backyard Observatory"
                  className="w-full bg-space-700 border border-space-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-nebula-purple rounded-lg font-medium hover:bg-opacity-80 transition"
            >
              Update Location
            </button>
          </form>
        </section>

        {/* Sky Conditions */}
        <section className="bg-space-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Sky Conditions (Simulation)</h2>
          <form onSubmit={handleConditionsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Seeing (arcsec): {conditionsForm.seeing.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={conditionsForm.seeing}
                  onChange={(e) =>
                    setConditionsForm({ ...conditionsForm, seeing: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Transparency: {Math.round(conditionsForm.transparency * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={conditionsForm.transparency}
                  onChange={(e) =>
                    setConditionsForm({ ...conditionsForm, transparency: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Cloud Cover: {Math.round(conditionsForm.cloud_cover * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={conditionsForm.cloud_cover}
                  onChange={(e) =>
                    setConditionsForm({ ...conditionsForm, cloud_cover: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Bortle Class: {conditionsForm.bortle_class}
                </label>
                <input
                  type="range"
                  min="1"
                  max="9"
                  step="1"
                  value={conditionsForm.bortle_class}
                  onChange={(e) =>
                    setConditionsForm({ ...conditionsForm, bortle_class: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Temperature: {conditionsForm.temperature}°C
                </label>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  step="1"
                  value={conditionsForm.temperature}
                  onChange={(e) =>
                    setConditionsForm({ ...conditionsForm, temperature: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Humidity: {conditionsForm.humidity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={conditionsForm.humidity}
                  onChange={(e) =>
                    setConditionsForm({ ...conditionsForm, humidity: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-nebula-purple rounded-lg font-medium hover:bg-opacity-80 transition"
            >
              Update Conditions
            </button>
          </form>
        </section>

        {/* Application Info */}
        <section className="bg-space-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">About</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              <span className="text-gray-300">Draco Astrophotography Simulator</span>
            </p>
            <p>Learn astrophotography through realistic simulation.</p>
            <p className="mt-4">
              Built with Go backend, React frontend, and real astronomical data.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
