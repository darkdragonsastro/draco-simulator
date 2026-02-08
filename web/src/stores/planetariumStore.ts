// Planetarium state management with Zustand

import { create } from 'zustand';
import { catalogApi, skyApi } from '../api/client';

export interface BrightStar {
  hip: number;
  ra: number;
  dec: number;
  vmag: number;
  bv: number;
  name?: string;
}

export interface ConstellationData {
  abbreviation: string;
  name: string;
  lines: number[][];
  label_ra: number;
  label_dec: number;
}

export interface PlanetInfo {
  body: string;
  ra: number;
  dec: number;
  altitude: number;
  azimuth: number;
  magnitude: number;
  is_visible: boolean;
  angular_diameter?: number;
  phase?: number;
  illumination?: number;
}

interface PlanetariumLayers {
  stars: boolean;
  constellationLines: boolean;
  constellationLabels: boolean;
  dsos: boolean;
  dsoImages: boolean;
  planets: boolean;
  altAzGrid: boolean;
  equatorialGrid: boolean;
  ecliptic: boolean;
  milkyWay: boolean;
  atmosphere: boolean;
  cardinals: boolean;
}

interface PlanetariumView {
  centerRA: number;   // degrees
  centerDec: number;  // degrees
  fov: number;        // degrees
}

interface PlanetariumStoreState {
  // Cached data
  brightStars: BrightStar[];
  constellations: ConstellationData[];
  planets: PlanetInfo[];
  starsLoaded: boolean;
  constellationsLoaded: boolean;

  // Layer visibility
  layers: PlanetariumLayers;

  // View state
  view: PlanetariumView;

  // Actions
  fetchBrightStars: () => Promise<void>;
  fetchConstellations: () => Promise<void>;
  fetchPlanets: () => Promise<void>;
  toggleLayer: (layer: keyof PlanetariumLayers) => void;
  setLayer: (layer: keyof PlanetariumLayers, value: boolean) => void;
  setView: (view: Partial<PlanetariumView>) => void;
  resetView: () => void;
}

const defaultView: PlanetariumView = {
  centerRA: 0,
  centerDec: 45,
  fov: 60,
};

export const usePlanetariumStore = create<PlanetariumStoreState>((set, get) => ({
  brightStars: [],
  constellations: [],
  planets: [],
  starsLoaded: false,
  constellationsLoaded: false,

  layers: {
    stars: true,
    constellationLines: true,
    constellationLabels: true,
    dsos: true,
    dsoImages: true,
    planets: true,
    altAzGrid: false,
    equatorialGrid: false,
    ecliptic: false,
    milkyWay: true,
    atmosphere: true,
    cardinals: true,
  },

  view: { ...defaultView },

  fetchBrightStars: async () => {
    if (get().starsLoaded) return;
    try {
      const result = await catalogApi.getBrightStars(6.5);
      set({ brightStars: result.stars, starsLoaded: true });
    } catch (err) {
      console.error('Failed to fetch bright stars:', err);
    }
  },

  fetchConstellations: async () => {
    if (get().constellationsLoaded) return;
    try {
      const result = await catalogApi.getConstellations();
      set({ constellations: result, constellationsLoaded: true });
    } catch (err) {
      console.error('Failed to fetch constellations:', err);
    }
  },

  fetchPlanets: async () => {
    try {
      const result = await skyApi.getPlanets();
      set({ planets: result.planets });
    } catch (err) {
      console.error('Failed to fetch planets:', err);
    }
  },

  toggleLayer: (layer) => {
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    }));
  },

  setLayer: (layer, value) => {
    set((state) => ({
      layers: { ...state.layers, [layer]: value },
    }));
  },

  setView: (partial) => {
    set((state) => ({
      view: { ...state.view, ...partial },
    }));
  },

  resetView: () => {
    set({ view: { ...defaultView } });
  },
}));
