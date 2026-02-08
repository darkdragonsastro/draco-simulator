// Sky state management with Zustand

import { create } from 'zustand';
import { skyApi, catalogApi } from '../api/client';
import type {
  SkyConditions,
  SkyTime,
  Location,
  TwilightInfo,
  MoonInfo,
  SunInfo,
  VisibleObject,
  TargetSuggestion,
} from '../api/client';

interface SkyState {
  // Sky conditions
  conditions: SkyConditions | null;
  time: SkyTime | null;
  location: Location | null;
  twilight: TwilightInfo | null;
  moon: MoonInfo | null;
  sun: SunInfo | null;

  // Targets
  visibleObjects: VisibleObject[];
  suggestedTargets: TargetSuggestion[];
  selectedTarget: VisibleObject | null;

  // Loading states
  isLoading: boolean;

  // Actions
  fetchAllSkyData: () => Promise<void>;
  fetchConditions: () => Promise<void>;
  fetchTime: () => Promise<void>;
  fetchLocation: () => Promise<void>;
  fetchTwilight: () => Promise<void>;
  fetchCelestialBodies: () => Promise<void>;
  fetchVisibleObjects: (minAlt?: number, maxMag?: number) => Promise<void>;
  fetchSuggestedTargets: (limit?: number) => Promise<void>;
  updateConditions: (conditions: Partial<SkyConditions>) => Promise<void>;
  updateLocation: (location: Partial<Location>) => Promise<void>;
  setTimeOffset: (hours: number) => Promise<void>;
  useRealTime: () => Promise<void>;
  selectTarget: (target: VisibleObject | null) => void;
}

export const useSkyStore = create<SkyState>((set, get) => ({
  // Initial state
  conditions: null,
  time: null,
  location: null,
  twilight: null,
  moon: null,
  sun: null,
  visibleObjects: [],
  suggestedTargets: [],
  selectedTarget: null,
  isLoading: false,

  // Actions
  fetchAllSkyData: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        get().fetchConditions(),
        get().fetchTime(),
        get().fetchLocation(),
        get().fetchTwilight(),
        get().fetchCelestialBodies(),
        get().fetchVisibleObjects(),
        get().fetchSuggestedTargets(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchConditions: async () => {
    try {
      const conditions = await skyApi.getConditions();
      set({ conditions });
    } catch (error) {
      console.error('Failed to fetch conditions:', error);
    }
  },

  fetchTime: async () => {
    try {
      const time = await skyApi.getTime();
      set({ time });
    } catch (error) {
      console.error('Failed to fetch time:', error);
    }
  },

  fetchLocation: async () => {
    try {
      const location = await skyApi.getLocation();
      set({ location });
    } catch (error) {
      console.error('Failed to fetch location:', error);
    }
  },

  fetchTwilight: async () => {
    try {
      const twilight = await skyApi.getTwilight();
      set({ twilight });
    } catch (error) {
      console.error('Failed to fetch twilight:', error);
    }
  },

  fetchCelestialBodies: async () => {
    try {
      const [moon, sun] = await Promise.all([skyApi.getMoon(), skyApi.getSun()]);
      set({ moon, sun });
    } catch (error) {
      console.error('Failed to fetch celestial bodies:', error);
    }
  },

  fetchVisibleObjects: async (minAlt = 30, maxMag = 12) => {
    try {
      const result = await catalogApi.getVisibleObjects({ minAlt, maxMag, limit: 50 });
      set({ visibleObjects: result.objects });
    } catch (error) {
      console.error('Failed to fetch visible objects:', error);
    }
  },

  fetchSuggestedTargets: async (limit = 5) => {
    try {
      const result = await catalogApi.suggestTargets(limit);
      set({ suggestedTargets: result.suggestions });
    } catch (error) {
      console.error('Failed to fetch suggested targets:', error);
    }
  },

  updateConditions: async (conditions: Partial<SkyConditions>) => {
    try {
      const updated = await skyApi.setConditions(conditions);
      set({ conditions: updated });
    } catch (error) {
      console.error('Failed to update conditions:', error);
    }
  },

  updateLocation: async (location: Partial<Location>) => {
    try {
      const updated = await skyApi.setLocation(location);
      set({ location: updated });
      // Refresh dependent data
      await Promise.all([
        get().fetchTwilight(),
        get().fetchCelestialBodies(),
        get().fetchVisibleObjects(),
      ]);
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  },

  setTimeOffset: async (hours: number) => {
    try {
      const time = await skyApi.setTime({ time_offset: hours, use_real_time: false });
      set({ time });
      // Refresh time-dependent data
      await Promise.all([
        get().fetchTwilight(),
        get().fetchCelestialBodies(),
        get().fetchVisibleObjects(),
      ]);
    } catch (error) {
      console.error('Failed to set time offset:', error);
    }
  },

  useRealTime: async () => {
    try {
      const time = await skyApi.setTime({ use_real_time: true });
      set({ time });
      // Refresh time-dependent data
      await Promise.all([
        get().fetchTwilight(),
        get().fetchCelestialBodies(),
        get().fetchVisibleObjects(),
      ]);
    } catch (error) {
      console.error('Failed to use real time:', error);
    }
  },

  selectTarget: (target: VisibleObject | null) => {
    set({ selectedTarget: target });
  },
}));
